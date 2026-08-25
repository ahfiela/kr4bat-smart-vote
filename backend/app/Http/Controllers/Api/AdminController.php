<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Category;
use App\Models\Candidate;
use App\Models\SchoolClass;
use App\Models\Voter;
use App\Models\VoterHistory;
use App\Models\VotingSession;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\File;
use Illuminate\Validation\Rule;

class AdminController extends Controller
{
    // === Sesi Pemilihan (Voting Sessions) ===

    public function index(): JsonResponse
    {
        $sessions = VotingSession::with('category')
            ->withCount('candidates')
            ->latest()
            ->get();

        return response()->json(['status' => 'success', 'data' => $sessions]);
    }

    public function show(VotingSession $session): JsonResponse
    {
        $session->load(['category', 'candidates']);

        return response()->json(['status' => 'success', 'data' => $session]);
    }

    public function getSessionParticipation(VotingSession $session): JsonResponse
    {
        // Eligible = role sesuai allowed_roles (+ allowed_classes bila diisi),
        // ATAU dimasukkan eksplisit lewat pencarian manual (allowed_voters)
        $allowedRoles = !empty($session->allowed_roles)
            ? $session->allowed_roles
            : ['SISWA', 'GURU_STAF', 'MITRA'];
        $allowedClasses = $session->allowed_classes ?? [];
        $allowedVoters = $session->allowed_voters ?? [];

        $eligible = Voter::query()
            ->where(function ($q) use ($allowedRoles, $allowedClasses, $allowedVoters) {
                $q->where(function ($q2) use ($allowedRoles, $allowedClasses) {
                    $q2->whereIn('role', $allowedRoles);
                    if (!empty($allowedClasses)) {
                        $q2->whereIn('class', $allowedClasses);
                    }
                });
                if (!empty($allowedVoters)) {
                    $q->orWhereIn('identifier', $allowedVoters);
                }
            })
            ->orderBy('name')
            ->get(['id', 'identifier', 'name', 'role', 'class']);

        $votedIds = VoterHistory::where('voting_session_id', $session->id)
            ->pluck('voter_id')
            ->all();

        $mapVoters = fn ($items) => collect($items)
            ->map(fn ($v) => [
                'identifier' => $v->identifier,
                'name'       => $v->name,
                'class'      => $v->class,
                'role'       => $v->role,
                'voted'      => in_array($v->id, $votedIds),
            ])
            ->values()
            ->all();

        $groups = [];
        $totalVoted = 0;

        // SISWA: dikelompokkan per kelas
        $siswa = $eligible->where('role', 'SISWA')->values();
        if ($siswa->isNotEmpty() || in_array('SISWA', $allowedRoles)) {
            $classNames = $siswa->groupBy(fn ($v) => $v->class ?: '(Tanpa Kelas)')->keys()->all();
            usort($classNames, function ($a, $b) {
                $ga = static::detectGradeRank($a);
                $gb = static::detectGradeRank($b);
                if ($ga !== $gb) return $ga <=> $gb;
                return strnatcasecmp($a, $b);
            });

            foreach ($classNames as $className) {
                $items = $siswa->filter(fn ($v) => ($v->class ?: '(Tanpa Kelas)') === $className)->all();
                $votedCount = count(array_filter($items, fn ($v) => in_array($v->id, $votedIds)));
                $totalVoted += $votedCount;

                $groups[] = [
                    'key'    => 'class:' . $className,
                    'label'  => $className,
                    'type'   => 'CLASS',
                    'total'  => count($items),
                    'voted'  => $votedCount,
                    'voters' => $mapVoters($items),
                ];
            }
        }

        // GURU_STAF & MITRA: satu grup per role
        foreach (['GURU_STAF' => 'Guru & Staf', 'MITRA' => 'Mitra'] as $role => $label) {
            $items = $eligible->where('role', $role)->values();
            if ($items->isEmpty() && !in_array($role, $allowedRoles)) continue;

            $arr = $items->all();
            $votedCount = count(array_filter($arr, fn ($v) => in_array($v->id, $votedIds)));
            $totalVoted += $votedCount;

            $groups[] = [
                'key'    => 'role:' . $role,
                'label'  => $label,
                'type'   => 'ROLE',
                'total'  => count($arr),
                'voted'  => $votedCount,
                'voters' => $mapVoters($arr),
            ];
        }

        return response()->json([
            'status' => 'success',
            'data'   => [
                'total_eligible' => $eligible->count(),
                'total_voted'    => $totalVoted,
                'not_voted'      => $eligible->count() - $totalVoted,
                'groups'         => $groups,
            ],
        ]);
    }

    private static function detectGradeRank(string $label): int
    {
        $n = strtoupper(trim($label));
        if (preg_match('/^(10|11|12)\b/', $n, $m)) return (int) $m[1];
        if (preg_match('/^(XII|XI|X)\b/', $n)) return ['X' => 10, 'XI' => 11, 'XII' => 12][explode(' ', $n)[0]];
        return 99;
    }

    public function storeSession(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'category_id'      => 'required|exists:categories,id',
            'name'             => 'required|string|max:150',
            'description'      => 'nullable|string',
            'year'             => 'required|digits:4',
            'room_code'        => 'required|string|max:20|unique:voting_sessions,room_code',
            'allowed_roles'    => 'nullable|array',
            'allowed_roles.*'  => 'string|in:SISWA,GURU_STAF,MITRA',
            'allowed_classes'  => 'nullable|array',
            'allowed_classes.*' => 'string',
            'status'           => 'nullable|string|in:DRAFT,ACTIVE,ARCHIVED',
        ]);

        $status = $validated['status'] ?? 'DRAFT';

        $session = VotingSession::create([
            'category_id'     => $validated['category_id'],
            'name'            => $validated['name'],
            'description'     => $validated['description'] ?? null,
            'year'            => $validated['year'],
            'room_code'       => $validated['room_code'],
            'allowed_roles'   => $validated['allowed_roles'] ?? ['SISWA', 'GURU_STAF', 'MITRA'],
            'allowed_classes' => $validated['allowed_classes'] ?? null,
            'status'          => $status,
        ]);

        return response()->json([
            'status'  => 'success',
            'message' => 'Sesi pemilihan berhasil dibuat',
            'data'    => $session->load(['category', 'candidates']),
        ], 201);
    }

    public function updateSession(Request $request, VotingSession $session): JsonResponse
    {
        // Jika sesi sudah ARCHIVED, kunci permanen!
        if ($session->status === 'ARCHIVED') {
            return response()->json([
                'status'  => 'error',
                'message' => 'Sesi ini sudah diarsipkan (ARCHIVED) dan telah dikunci permanen. Sesi tidak dapat diubah lagi.',
            ], 422);
        }

        $validated = $request->validate([
            'category_id'      => 'required|exists:categories,id',
            'name'             => 'required|string|max:150',
            'year'             => 'required|digits:4',
            'room_code'        => ['required', 'string', 'max:20', Rule::unique('voting_sessions', 'room_code')->ignore($session->id)],
            'allowed_classes'  => 'nullable|array',
            'allowed_classes.*' => 'string',
        ]);

        // Jika mengubah kategori, periksa apakah kategori baru sedang aktif di sesi lain
        if ($session->category_id != $validated['category_id']) {
            if ($session->status === 'ACTIVE' || $session->status === 'DRAFT') {
                $exists = VotingSession::where('category_id', $validated['category_id'])
                    ->whereIn('status', ['DRAFT', 'ACTIVE'])
                    ->exists();
                if ($exists) {
                    return response()->json([
                        'status'  => 'error',
                        'message' => 'Kategori ini sedang digunakan pada sesi aktif/draft lain!',
                    ], 422);
                }
            }
        }

        $session->update($validated);

        return response()->json([
            'status'  => 'success',
            'message' => 'Sesi pemilihan berhasil diperbarui',
            'data'    => $session,
        ]);
    }

    public function destroySession(VotingSession $session): JsonResponse
    {
        $session->delete();

        return response()->json([
            'status'  => 'success',
            'message' => 'Sesi pemilihan berhasil dihapus',
        ]);
    }

    public function updateStatus(Request $request, VotingSession $session): JsonResponse
    {
        // Aturan Penguncian Permanen (Requirement 5)
        if ($session->status === 'ARCHIVED') {
            return response()->json([
                'status'  => 'error',
                'message' => 'Sesi ini sudah diakhiri dan dikunci permanen di History. Tidak dapat diaktivasi ulang.',
            ], 422);
        }

        $validated = $request->validate([
            'status' => ['required', Rule::in(['DRAFT', 'ACTIVE', 'ARCHIVED'])],
        ]);

        $newStatus = $validated['status'];

        // Cegah bentrok kategori jika diubah ke ACTIVE atau DRAFT
        if ($newStatus === 'ACTIVE' || $newStatus === 'DRAFT') {
            $exists = VotingSession::where('category_id', $session->category_id)
                ->where('id', '!=', $session->id)
                ->whereIn('status', ['DRAFT', 'ACTIVE'])
                ->exists();
            if ($exists) {
                return response()->json([
                    'status'  => 'error',
                    'message' => 'Kategori sesi ini sedang aktif atau dalam draft pada sesi lain! Tidak bisa diaktifkan.',
                ], 422);
            }
        }

        $session->update($validated);

        return response()->json([
            'status'  => 'success',
            'message' => "Status sesi diubah menjadi {$newStatus}",
            'data'    => $session,
        ]);
    }

    public function publishResults(VotingSession $session): JsonResponse
    {
        if ($session->status !== 'ARCHIVED') {
            return response()->json([
                'status'  => 'error',
                'message' => 'Hasil voting hanya dapat dipublikasikan setelah sesi diakhiri (ARCHIVED).',
            ], 422);
        }

        $session->update(['results_published' => true]);

        return response()->json([
            'status'  => 'success',
            'message' => 'Hasil pemilu berhasil disubmit dan dipublikasikan ke pemilih',
            'data'    => $session,
        ]);
    }

    public function activateKloter(Request $request, VotingSession $session): JsonResponse
    {
        $validated = $request->validate([
            'kloter' => 'nullable|string',
        ]);

        $session->update(['active_kloter' => $validated['kloter'] ?? null]);

        return response()->json([
            'status'  => 'success',
            'message' => $validated['kloter'] ? "Kloter '{$validated['kloter']}' resmi diaktifkan untuk akses bilik" : 'Aktifkan kloter dibebaskan',
            'data'    => $session,
        ]);
    }

    public function completeKloter(Request $request, VotingSession $session): JsonResponse
    {
        $validated = $request->validate([
            'kloter' => 'required|string',
        ]);

        $kloter = $validated['kloter'];
        $currentKloters = $session->completed_kloters ?? [];

        if (!in_array($kloter, $currentKloters)) {
            $currentKloters[] = $kloter;
        }

        // Reset active_kloter jika kloter yang diselesaikan adalah kloter aktif saat ini
        $newActiveKloter = ($session->active_kloter === $kloter) ? null : $session->active_kloter;

        $session->update([
            'completed_kloters' => $currentKloters,
            'active_kloter'     => $newActiveKloter,
        ]);

        return response()->json([
            'status'  => 'success',
            'message' => "Kloter '{$kloter}' berhasil diselesaikan dan dikunci",
            'data'    => $session,
        ]);
    }

    public function addVoterToSession(Request $request, VotingSession $session): JsonResponse
    {
        $validated = $request->validate([
            'identifier' => 'required|string',
        ]);

        $identifier = $validated['identifier'];
        $currentVoters = $session->allowed_voters ?? [];

        if (!in_array($identifier, $currentVoters)) {
            $currentVoters[] = $identifier;
            $session->update(['allowed_voters' => $currentVoters]);
        }

        return response()->json([
            'status'  => 'success',
            'message' => "Pemilih {$identifier} berhasil ditambahkan ke bilik secara manual",
            'data'    => $session,
        ]);
    }

    // === Master Data Kelas (School Classes) ===

    public function getSchoolClasses(): JsonResponse
    {
        $classes = SchoolClass::oldest('name')->get();

        if ($classes->isEmpty()) {
            $defaults = ['10 PPLG 1', '10 PPLG 2', '10 ANIMASI 1', '11 PPLG 1', '11 PPLG 2', '12 PPLG 1'];
            foreach ($defaults as $def) {
                SchoolClass::firstOrCreate(['name' => $def]);
            }
            $classes = SchoolClass::oldest('name')->get();
        }

        return response()->json(['status' => 'success', 'data' => $classes]);
    }

    public function storeSchoolClass(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:100|unique:school_classes,name',
        ]);

        $schoolClass = SchoolClass::create($validated);

        return response()->json(['status' => 'success', 'message' => 'Data kelas berhasil ditambahkan', 'data' => $schoolClass], 201);
    }

    public function updateSchoolClass(Request $request, SchoolClass $schoolClass): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:100', Rule::unique('school_classes', 'name')->ignore($schoolClass->id)],
        ]);

        $schoolClass->update($validated);

        return response()->json(['status' => 'success', 'message' => 'Data kelas berhasil diperbarui', 'data' => $schoolClass]);
    }

    public function destroySchoolClass(SchoolClass $schoolClass): JsonResponse
    {
        $schoolClass->delete();
        return response()->json(['status' => 'success', 'message' => 'Data kelas berhasil dihapus']);
    }

    // === Kategori Sesi (Session Categories) ===

    public function getCategories(): JsonResponse
    {
        $categories = Category::oldest()->get();

        if ($categories->isEmpty()) {
            $defaults = ['Ketua & Wakil Ketua OSIS', 'Ketua & Wakil Ketua MPK', 'Pemilihan Ekskul'];
            foreach ($defaults as $def) {
                Category::create(['name' => $def]);
            }
            $categories = Category::oldest()->get();
        }

        return response()->json(['status' => 'success', 'data' => $categories]);
    }

    public function storeCategory(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:100|unique:categories,name',
        ]);

        $category = Category::create($validated);

        return response()->json(['status' => 'success', 'message' => 'Kategori berhasil ditambahkan', 'data' => $category], 201);
    }

    public function updateCategory(Request $request, Category $category): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:100', Rule::unique('categories', 'name')->ignore($category->id)],
        ]);

        $category->update($validated);

        return response()->json(['status' => 'success', 'message' => 'Kategori berhasil diperbarui', 'data' => $category]);
    }

    public function destroyCategory(Category $category): JsonResponse
    {
        $category->delete();
        return response()->json(['status' => 'success', 'message' => 'Kategori berhasil dihapus']);
    }

    // === Kandidat Paslon (Pasangan Calon) ===

    public function getCandidates(VotingSession $session): JsonResponse
    {
        $candidates = $session->candidates()->orderBy('candidate_number')->get();
        return response()->json(['status' => 'success', 'data' => $candidates]);
    }

    public function storeCandidate(Request $request, VotingSession $session): JsonResponse
    {
        $validated = $request->validate([
            'candidate_number' => 'nullable|string|max:20',
            'name'             => 'required|string|max:150', // Nama Ketua
            'wakil_name'       => 'nullable|string|max:150', // Nama Wakil Ketua
            'photo'            => 'nullable|image|max:2048',
            'ketua_photo'      => 'nullable|image|max:2048',
            'wakil_photo'      => 'nullable|image|max:2048',
            'vision'           => 'required|string',
            'mission'          => 'required|string',
            'experience'       => 'nullable|string',
            'wakil_experience' => 'nullable|string',
        ]);

        $existingCount = $session->candidates()->count();
        $candidateNumber = !empty($validated['candidate_number']) 
            ? $validated['candidate_number'] 
            : (string)($existingCount + 1);

        $targetDir = public_path('uploads/candidates');
        if (!File::exists($targetDir)) {
            File::makeDirectory($targetDir, 0755, true);
        }

        // Handle Ketua photo
        $ketuaPhotoPath = null;
        if ($request->hasFile('ketua_photo')) {
            $file = $request->file('ketua_photo');
            $filename = time() . '_ketua_' . $file->getClientOriginalName();
            $file->move($targetDir, $filename);
            $ketuaPhotoPath = '/uploads/candidates/' . $filename;
        } elseif ($request->hasFile('photo')) {
            $file = $request->file('photo');
            $filename = time() . '_' . $file->getClientOriginalName();
            $file->move($targetDir, $filename);
            $ketuaPhotoPath = '/uploads/candidates/' . $filename;
        }

        // Handle Wakil photo
        $wakilPhotoPath = null;
        if ($request->hasFile('wakil_photo')) {
            $file = $request->file('wakil_photo');
            $filename = time() . '_wakil_' . $file->getClientOriginalName();
            $file->move($targetDir, $filename);
            $wakilPhotoPath = '/uploads/candidates/' . $filename;
        }

        $candidate = $session->candidates()->create([
            'candidate_number' => $candidateNumber,
            'name'             => $validated['name'],
            'wakil_name'       => $validated['wakil_name'] ?? null,
            'photo_path'       => $ketuaPhotoPath,
            'ketua_photo_path' => $ketuaPhotoPath,
            'wakil_photo_path' => $wakilPhotoPath,
            'vision'           => $validated['vision'],
            'mission'          => $validated['mission'],
            'experience'       => $validated['experience'] ?? null,
            'wakil_experience' => $validated['wakil_experience'] ?? null,
            'votes_count'      => 0,
        ]);

        return response()->json(['status' => 'success', 'message' => 'Paslon kandidat berhasil ditambahkan', 'data' => $candidate], 201);
    }

    public function updateCandidate(Request $request, Candidate $candidate): JsonResponse
    {
        $validated = $request->validate([
            'candidate_number' => 'required|string|max:20',
            'name'             => 'required|string|max:150',
            'wakil_name'       => 'nullable|string|max:150',
            'photo'            => 'nullable|image|max:2048',
            'ketua_photo'      => 'nullable|image|max:2048',
            'wakil_photo'      => 'nullable|image|max:2048',
            'vision'           => 'required|string',
            'mission'          => 'required|string',
            'experience'       => 'nullable|string',
            'wakil_experience' => 'nullable|string',
        ]);

        $targetDir = public_path('uploads/candidates');
        if (!File::exists($targetDir)) {
            File::makeDirectory($targetDir, 0755, true);
        }

        $ketuaPhotoPath = $candidate->ketua_photo_path ?? $candidate->photo_path;
        if ($request->hasFile('ketua_photo') || $request->hasFile('photo')) {
            $file = $request->file('ketua_photo') ?? $request->file('photo');
            $filename = time() . '_ketua_' . $file->getClientOriginalName();
            $file->move($targetDir, $filename);
            $ketuaPhotoPath = '/uploads/candidates/' . $filename;
        }

        $wakilPhotoPath = $candidate->wakil_photo_path;
        if ($request->hasFile('wakil_photo')) {
            $file = $request->file('wakil_photo');
            $filename = time() . '_wakil_' . $file->getClientOriginalName();
            $file->move($targetDir, $filename);
            $wakilPhotoPath = '/uploads/candidates/' . $filename;
        }

        $candidate->update([
            'candidate_number' => $validated['candidate_number'],
            'name'             => $validated['name'],
            'wakil_name'       => $validated['wakil_name'] ?? null,
            'photo_path'       => $ketuaPhotoPath,
            'ketua_photo_path' => $ketuaPhotoPath,
            'wakil_photo_path' => $wakilPhotoPath,
            'vision'           => $validated['vision'],
            'mission'          => $validated['mission'],
            'experience'       => $validated['experience'] ?? null,
            'wakil_experience' => $validated['wakil_experience'] ?? null,
        ]);

        return response()->json(['status' => 'success', 'message' => 'Data Paslon berhasil diperbarui', 'data' => $candidate]);
    }

    public function destroyCandidate(Candidate $candidate): JsonResponse
    {
        if ($candidate->photo_path && File::exists(public_path($candidate->photo_path))) {
            File::delete(public_path($candidate->photo_path));
        }
        if ($candidate->ketua_photo_path && File::exists(public_path($candidate->ketua_photo_path))) {
            File::delete(public_path($candidate->ketua_photo_path));
        }
        if ($candidate->wakil_photo_path && File::exists(public_path($candidate->wakil_photo_path))) {
            File::delete(public_path($candidate->wakil_photo_path));
        }
        $candidate->delete();

        return response()->json(['status' => 'success', 'message' => 'Paslon kandidat berhasil dihapus']);
    }

    // === Pemilih (Voters) ===

    public function getVoters(Request $request): JsonResponse
    {
        $query = Voter::query();

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('identifier', 'like', "%{$search}%");
            });
        }

        if ($request->filled('role')) {
            $query->where('role', $request->role);
        }

        if ($request->filled('class')) {
            $query->where('class', $request->class);
        }

        $voters = $query->latest()->paginate(50);

        return response()->json(['status' => 'success', 'data' => $voters]);
    }

    public function storeVoter(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'identifier' => 'required|string|max:50|unique:voters,identifier',
            'name'       => 'required|string|max:150',
            'role'       => 'required|in:SISWA,GURU_STAF,MITRA',
            'class'      => 'nullable|string|max:50',
            'password'   => 'nullable|string|min:6',
        ]);

        $password = empty($validated['password']) ? $validated['identifier'] : $validated['password'];

        $voter = Voter::create([
            'identifier' => $validated['identifier'],
            'name'       => $validated['name'],
            'role'       => $validated['role'],
            'class'      => $validated['class'],
            'password'   => Hash::make($password),
        ]);

        return response()->json(['status' => 'success', 'message' => 'Pemilih berhasil ditambahkan', 'data' => $voter], 201);
    }

    public function updateVoter(Request $request, Voter $voter): JsonResponse
    {
        $validated = $request->validate([
            'identifier' => ['required', 'string', 'max:50', Rule::unique('voters', 'identifier')->ignore($voter->id)],
            'name'       => 'required|string|max:150',
            'role'       => 'required|in:SISWA,GURU_STAF,MITRA',
            'class'      => 'nullable|string|max:50',
            'password'   => 'nullable|string|min:6',
        ]);

        $voter->identifier = $validated['identifier'];
        $voter->name = $validated['name'];
        $voter->role = $validated['role'];
        $voter->class = $validated['class'];

        if (!empty($validated['password'])) {
            $voter->password = Hash::make($validated['password']);
        }

        $voter->save();

        return response()->json(['status' => 'success', 'message' => 'Data pemilih berhasil diperbarui', 'data' => $voter]);
    }

    public function destroyVoter(Voter $voter): JsonResponse
    {
        $voter->delete();
        return response()->json(['status' => 'success', 'message' => 'Pemilih berhasil dihapus']);
    }

    public function getVoterClasses(): JsonResponse
    {
        $schoolClasses = SchoolClass::pluck('name')->toArray();
        $voterClasses = Voter::whereNotNull('class')
            ->where('class', '!=', '')
            ->distinct()
            ->pluck('class')
            ->toArray();

        $merged = array_unique(array_merge($schoolClasses, $voterClasses));
        sort($merged);

        return response()->json(['status' => 'success', 'data' => array_values($merged)]);
    }

    public function importVoters(Request $request): JsonResponse
    {
        $request->validate([
            'role'              => ['required', 'in:SISWA,GURU_STAF'],
            'rows'              => ['required', 'array', 'min:1'],
            'rows.*.identifier' => ['required', 'string', 'max:255'],
            'rows.*.name'       => ['required', 'string', 'max:255'],
            'rows.*.class'      => ['nullable', 'string', 'max:255'],
        ]);

        // Import ribuan baris butuh waktu (hashing bcrypt per baris), bebas dari batas 30 detik
        set_time_limit(0);

        $defaultRole = $request->input('role');

        $rows = collect($request->input('rows'))
            ->map(function ($row) use ($defaultRole) {
                $identifier = trim((string) $row['identifier']);
                $name = trim((string) $row['name']);
                $class = isset($row['class']) && trim((string) $row['class']) !== ''
                    ? trim((string) $row['class'])
                    : null;

                return [
                    'identifier' => $identifier,
                    'name'       => $name,
                    'role'       => $defaultRole,
                    'class'      => $class,
                    'password'   => Hash::make($identifier), // Password bawaan = NISN
                ];
            })
            ->filter(fn ($row) => $row['identifier'] !== '' && $row['name'] !== '')
            ->unique('identifier')
            ->values();

        if ($rows->isEmpty()) {
            return response()->json(['status' => 'error', 'message' => 'Tidak ada baris data valid ditemukan di file.'], 400);
        }

        DB::beginTransaction();

        try {
            // Satu query untuk mengetahui identifier yang sudah terdaftar
            $existingIdentifiers = Voter::whereIn('identifier', $rows->pluck('identifier'))
                ->pluck('identifier')
                ->all();

            $timestamp = now();
            $records = $rows
                ->map(fn ($row) => $row + ['created_at' => $timestamp, 'updated_at' => $timestamp])
                ->chunk(500);

            // Batch upsert: insert baru & update yang sudah ada dalam satu query per chunk
            foreach ($records as $chunk) {
                Voter::upsert(
                    $chunk->all(),
                    ['identifier'],
                    ['name', 'role', 'class', 'password', 'updated_at']
                );
            }

            DB::commit();
        } catch (\Throwable $e) {
            DB::rollBack();

            return response()->json([
                'status'  => 'error',
                'message' => 'Gagal mengimpor data: ' . $e->getMessage(),
            ], 500);
        }

        $updated = count($existingIdentifiers);
        $imported = $rows->count() - $updated;

        return response()->json([
            'status'  => 'success',
            'message' => "Voter berhasil di-import. Baru: {$imported}, Diperbarui: {$updated}."
        ]);
    }

    // === Update Profile Admin ===

    public function updateProfile(Request $request): JsonResponse
    {
        $admin = $request->user();

        $validated = $request->validate([
            'name'     => 'sometimes|string|max:150',
            'username' => ['sometimes', 'string', 'max:100', Rule::unique('users', 'username')->ignore($admin->id)],
            'password' => 'sometimes|nullable|string|min:6|confirmed',
        ]);

        if (!empty($validated['password'])) {
            $validated['password'] = Hash::make($validated['password']);
        } else {
            unset($validated['password']);
        }

        $admin->update($validated);

        return response()->json([
            'status'  => 'success',
            'message' => 'Profil admin berhasil diperbarui',
            'data'    => $admin->only(['name', 'username']),
        ]);
    }
}