package com.edutrack.storage;

import com.edutrack.common.ApiException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.UUID;

@Service
public class LocalDiskStorageService implements FileStorageService {

    private final Path basePath;

    public LocalDiskStorageService(@Value("${storage.base-path:./storage}") String basePath) {
        this.basePath = Paths.get(basePath);
        try {
            Files.createDirectories(this.basePath);
        } catch (IOException e) {
            throw new IllegalStateException("Could not create storage directory: " + basePath, e);
        }
    }

    @Override
    public String store(MultipartFile file, String subDirectory) {
        try {
            Path dir = basePath.resolve(subDirectory);
            Files.createDirectories(dir);
            String originalName = StringUtils.cleanPath(file.getOriginalFilename() == null ? "file" : file.getOriginalFilename());
            String fileName = UUID.randomUUID() + "-" + originalName;
            Path target = dir.resolve(fileName);
            file.transferTo(target);
            return subDirectory + "/" + fileName;
        } catch (IOException e) {
            throw ApiException.internal("Failed to store uploaded file: " + e.getMessage());
        }
    }

    @Override
    public byte[] load(String fileRef) {
        try {
            return Files.readAllBytes(basePath.resolve(fileRef));
        } catch (IOException e) {
            throw ApiException.notFound("File not found: " + fileRef);
        }
    }
}
