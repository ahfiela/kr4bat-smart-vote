<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Category;
use App\Models\Candidate;
use App\Models\Voter;
use App\Models\VotingSession;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
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

    public function storeSession(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'category_id'      => 'required|exists:categories,id',
            'name'             => 'required|string|max:150',
            'year'             => 'required|digits:4',
            'room_code'        => 'required|string|max:20|unique:voting_sessions,room_code',
            'allowed_classes'  => 'nullable|array',
            'allowed_classes.*' => 'string',
            'status'           => 'nullable|string|in:DRAFT,ACTIVE,ARCHIVED',
        ]);

        $status = $validated['status'] ?? 'DRAFT';

        // Cegah bentrok kategori jika status DRAFT atau ACTIVE
        if ($status === 'ACTIVE' || $status === 'DRAFT') {
            $exists = VotingSession::where('category_id', $validated['category_id'])
                ->whereIn('status', ['DRAFT', 'ACTIVE'])
                ->exists();
            if ($exists) {
                return response()->json([
                    'status'  => 'error',
                    'message' => 'Kategori ini sedang digunakan pada sesi aktif/draft lain. Selesaikan sesi tersebut terlebih dahulu!',
                ], 422);
            }
        }

        $session = VotingSession::create([
            'category_id'     => $validated['category_id'],
            'name'            => $validated['name'],
            'year'            => $validated['year'],
            'room_code'       => $validated['room_code'],
            'allowed_classes' => $validated['allowed_classes'] ?? null,
            'status'          => $status,
        ]);

        return response()->json([
            'status'  => 'success',
            'message' => 'Sesi pemilihan berhasil dibuat',
            'data'    => $session,
        ], 201);
    }

    public function updateSession(Request $request, VotingSession $session): JsonResponse
    {
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

    // === Kategori (Categories) ===

    public function getCategories(): JsonResponse
    {
        $categories = Category::latest()->get();
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

    // === Kandidat (Candidates) ===

    public function getCandidates(VotingSession $session): JsonResponse
    {
        $candidates = $session->candidates()->orderBy('candidate_number')->get();
        return response()->json(['status' => 'success', 'data' => $candidates]);
    }

    public function storeCandidate(Request $request, VotingSession $session): JsonResponse
    {
        $validated = $request->validate([
            'candidate_number' => 'required|string|max:20',
            'name'             => 'required|string|max:150',
            'photo'            => 'nullable|image|max:2048', // maks 2MB
            'vision'           => 'required|string',
            'mission'          => 'required|string',
        ]);

        $photoPath = null;
        if ($request->hasFile('photo')) {
            $file = $request->file('photo');
            $filename = time() . '_' . $file->getClientOriginalName();
            // Simpan langsung di public path agar mudah diakses
            $targetDir = public_path('uploads/candidates');
            if (!File::exists($targetDir)) {
                File::makeDirectory($targetDir, 0755, true);
            }
            $file->move($targetDir, $filename);
            $photoPath = '/uploads/candidates/' . $filename;
        }

        $candidate = $session->candidates()->create([
            'candidate_number' => $validated['candidate_number'],
            'name'             => $validated['name'],
            'photo_path'       => $photoPath,
            'vision'           => $validated['vision'],
            'mission'          => $validated['mission'],
            'votes_count'      => 0,
        ]);

        return response()->json(['status' => 'success', 'message' => 'Kandidat berhasil ditambahkan', 'data' => $candidate], 201);
    }

    public function updateCandidate(Request $request, Candidate $candidate): JsonResponse
    {
        $validated = $request->validate([
            'candidate_number' => 'required|string|max:20',
            'name'             => 'required|string|max:150',
            'photo'            => 'nullable|image|max:2048',
            'vision'           => 'required|string',
            'mission'          => 'required|string',
        ]);

        $photoPath = $candidate->photo_path;
        if ($request->hasFile('photo')) {
            // Hapus foto lama jika ada
            if ($candidate->photo_path) {
                $oldPath = public_path($candidate->photo_path);
                if (File::exists($oldPath)) {
                    File::delete($oldPath);
                }
            }

            $file = $request->file('photo');
            $filename = time() . '_' . $file->getClientOriginalName();
            $targetDir = public_path('uploads/candidates');
            if (!File::exists($targetDir)) {
                File::makeDirectory($targetDir, 0755, true);
            }
            $file->move($targetDir, $filename);
            $photoPath = '/uploads/candidates/' . $filename;
        }

        $candidate->update([
            'candidate_number' => $validated['candidate_number'],
            'name'             => $validated['name'],
            'photo_path'       => $photoPath,
            'vision'           => $validated['vision'],
            'mission'          => $validated['mission'],
        ]);

        return response()->json(['status' => 'success', 'message' => 'Kandidat berhasil diperbarui', 'data' => $candidate]);
    }

    public function destroyCandidate(Candidate $candidate): JsonResponse
    {
        if ($candidate->photo_path) {
            $oldPath = public_path($candidate->photo_path);
            if (File::exists($oldPath)) {
                File::delete($oldPath);
            }
        }
        $candidate->delete();

        return response()->json(['status' => 'success', 'message' => 'Kandidat berhasil dihapus']);
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
        $classes = Voter::whereNotNull('class')
            ->where('class', '!=', '')
            ->distinct()
            ->pluck('class')
            ->sort()
            ->values();

        return response()->json(['status' => 'success', 'data' => $classes]);
    }

    public function importVoters(Request $request): JsonResponse
    {
        $request->validate([
            'file' => 'required|file|mimes:csv,txt',
        ]);

        $file = $request->file('file');
        $filePath = $file->getRealPath();

        $handle = fopen($filePath, 'r');
        if (!$handle) {
            return response()->json(['status' => 'error', 'message' => 'Gagal membuka file CSV.'], 400);
        }

        // Baca header
        $header = fgetcsv($handle, 1000, ';'); // dukung separator semicolon/koma
        if (!$header || count($header) < 2) {
            // Coba dengan separator koma
            rewind($handle);
            $header = fgetcsv($handle, 1000, ',');
            $separator = ',';
        } else {
            $separator = ';';
        }

        if (!$header) {
            fclose($handle);
            return response()->json(['status' => 'error', 'message' => 'Format file CSV tidak valid.'], 400);
        }

        // Bersihkan header
        $header = array_map(function ($h) {
            return trim(strtolower($h));
        }, $header);

        $identifierIdx = array_search('identifier', $header);
        $nameIdx = array_search('name', $header);
        $roleIdx = array_search('role', $header);
        $classIdx = array_search('class', $header);
        $passwordIdx = array_search('password', $header);

        if ($identifierIdx === false || $nameIdx === false || $roleIdx === false) {
            fclose($handle);
            return response()->json([
                'status' => 'error',
                'message' => 'Format CSV salah. Harus terdapat kolom: identifier, name, dan role.'
            ], 400);
        }

        $imported = 0;
        $updated = 0;

        while (($row = fgetcsv($handle, 1000, $separator)) !== false) {
            if (empty(array_filter($row))) continue;

            $identifier = trim($row[$identifierIdx] ?? '');
            $name = trim($row[$nameIdx] ?? '');
            $roleRaw = trim($row[$roleIdx] ?? '');
            $role = strtoupper($roleRaw);
            $class = ($classIdx !== false && isset($row[$classIdx])) ? trim($row[$classIdx]) : null;
            $passwordRaw = ($passwordIdx !== false && isset($row[$passwordIdx])) ? trim($row[$passwordIdx]) : '';

            if (empty($identifier) || empty($name) || empty($role)) {
                continue;
            }

            if (!in_array($role, ['SISWA', 'GURU_STAF', 'MITRA'])) {
                $role = 'SISWA';
            }

            $voter = Voter::where('identifier', $identifier)->first();
            $password = empty($passwordRaw) ? $identifier : $passwordRaw;

            if ($voter) {
                $voter->update([
                    'name'     => $name,
                    'role'     => $role,
                    'class'    => $class,
                    'password' => Hash::make($password),
                ]);
                $updated++;
            } else {
                Voter::create([
                    'identifier' => $identifier,
                    'name'       => $name,
                    'role'       => $role,
                    'class'      => $class,
                    'password'   => Hash::make($password),
                ]);
                $imported++;
            }
        }

        fclose($handle);

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