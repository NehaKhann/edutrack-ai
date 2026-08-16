package com.edutrack.storage;

import com.edutrack.common.ApiException;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.util.Arrays;
import java.util.Map;
import java.util.Set;

/**
 * Blocks the small set of file types that should never be stored and served back — executables, scripts,
 * and raw HTML/SVG (which can carry embedded script content). Everything else (PDFs, office documents,
 * images, video, audio) passes through untouched; this is a denylist rather than a strict allowlist so it
 * doesn't need to anticipate every legitimate attachment type used across chat, diary, syllabus, and leave
 * documents.
 *
 * Also verifies file *content* against the claimed extension for the handful of types we can cheaply
 * fingerprint (magic bytes) — this stops the classic "rename a disguised file to look innocent" trick
 * without needing a real antivirus scanner, which isn't realistic to run for free on this deployment.
 */
public final class UploadGuard {

    private static final Set<String> BLOCKED_EXTENSIONS = Set.of(
            "html", "htm", "svg", "js", "mjs", "exe", "bat", "cmd", "com", "scr", "msi", "jar", "sh", "ps1", "vbs", "app"
    );

    /** One signature per checkable extension; office formats share signatures since they're just ZIP/OLE2 containers. */
    private static final Map<String, byte[]> MAGIC_BYTES = Map.ofEntries(
            Map.entry("pdf", new byte[]{'%', 'P', 'D', 'F'}),
            Map.entry("png", new byte[]{(byte) 0x89, 'P', 'N', 'G'}),
            Map.entry("jpg", new byte[]{(byte) 0xFF, (byte) 0xD8, (byte) 0xFF}),
            Map.entry("jpeg", new byte[]{(byte) 0xFF, (byte) 0xD8, (byte) 0xFF}),
            Map.entry("gif", new byte[]{'G', 'I', 'F', '8'}),
            Map.entry("docx", new byte[]{'P', 'K', 0x03, 0x04}),
            Map.entry("xlsx", new byte[]{'P', 'K', 0x03, 0x04}),
            Map.entry("pptx", new byte[]{'P', 'K', 0x03, 0x04}),
            Map.entry("doc", new byte[]{(byte) 0xD0, (byte) 0xCF, 0x11, (byte) 0xE0}),
            Map.entry("xls", new byte[]{(byte) 0xD0, (byte) 0xCF, 0x11, (byte) 0xE0}),
            Map.entry("ppt", new byte[]{(byte) 0xD0, (byte) 0xCF, 0x11, (byte) 0xE0})
    );

    private UploadGuard() {
    }

    public static void assertSafe(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            return;
        }
        String name = file.getOriginalFilename();
        if (name == null) {
            return;
        }
        int dot = name.lastIndexOf('.');
        if (dot < 0 || dot == name.length() - 1) {
            return;
        }
        String ext = name.substring(dot + 1).toLowerCase();
        if (BLOCKED_EXTENSIONS.contains(ext)) {
            throw ApiException.badRequest("This file type isn't allowed: ." + ext);
        }
        assertContentMatchesExtension(file, ext);
    }

    private static void assertContentMatchesExtension(MultipartFile file, String ext) {
        if ("webp".equals(ext)) {
            byte[] header = readHeader(file, 12);
            boolean ok = header.length >= 12
                    && header[0] == 'R' && header[1] == 'I' && header[2] == 'F' && header[3] == 'F'
                    && header[8] == 'W' && header[9] == 'E' && header[10] == 'B' && header[11] == 'P';
            if (!ok) {
                throw ApiException.badRequest("This file's content doesn't match its extension.");
            }
            return;
        }
        byte[] signature = MAGIC_BYTES.get(ext);
        if (signature == null) {
            return;
        }
        byte[] header = readHeader(file, signature.length);
        if (!startsWith(header, signature)) {
            throw ApiException.badRequest("This file's content doesn't match its extension.");
        }
    }

    private static boolean startsWith(byte[] header, byte[] signature) {
        if (header.length < signature.length) {
            return false;
        }
        for (int i = 0; i < signature.length; i++) {
            if (header[i] != signature[i]) {
                return false;
            }
        }
        return true;
    }

    private static byte[] readHeader(MultipartFile file, int maxBytes) {
        try (InputStream in = file.getInputStream()) {
            byte[] buffer = new byte[maxBytes];
            int read = in.readNBytes(buffer, 0, maxBytes);
            return read == maxBytes ? buffer : Arrays.copyOf(buffer, read);
        } catch (IOException e) {
            throw ApiException.internal("Could not read uploaded file", e);
        }
    }
}
