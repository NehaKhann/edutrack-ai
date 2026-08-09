package com.edutrack.storage;

import org.springframework.web.multipart.MultipartFile;

public interface FileStorageService {

    /**
     * Persists the file and returns a reference (path or URL) that can later be resolved via {@link #load}.
     */
    String store(MultipartFile file, String subDirectory);

    byte[] load(String fileRef);
}
