package com.edutrack.storage;

import com.edutrack.common.ApiException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.DeleteObjectRequest;
import software.amazon.awssdk.services.s3.model.GetObjectRequest;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;

import java.io.IOException;
import java.net.URI;
import java.util.UUID;

/** Stores files in Cloudflare R2 (S3-compatible) — needed in production, where the local disk is ephemeral. */
@Service
@ConditionalOnProperty(name = "storage.provider", havingValue = "r2")
public class R2StorageService implements FileStorageService {

    private static final Logger log = LoggerFactory.getLogger(R2StorageService.class);

    private final S3Client s3;
    private final String bucket;

    public R2StorageService(
            @Value("${storage.r2.account-id}") String accountId,
            @Value("${storage.r2.access-key}") String accessKey,
            @Value("${storage.r2.secret-key}") String secretKey,
            @Value("${storage.r2.bucket}") String bucket) {
        this.bucket = bucket;
        this.s3 = S3Client.builder()
                .endpointOverride(URI.create("https://" + accountId + ".r2.cloudflarestorage.com"))
                .region(Region.of("auto"))
                .credentialsProvider(StaticCredentialsProvider.create(AwsBasicCredentials.create(accessKey, secretKey)))
                .build();
    }

    @Override
    public String store(MultipartFile file, String subDirectory) {
        try {
            String originalName = StringUtils.cleanPath(file.getOriginalFilename() == null ? "file" : file.getOriginalFilename());
            String key = subDirectory + "/" + UUID.randomUUID() + "-" + originalName;
            s3.putObject(
                    PutObjectRequest.builder().bucket(bucket).key(key).contentType(file.getContentType()).build(),
                    RequestBody.fromInputStream(file.getInputStream(), file.getSize()));
            return key;
        } catch (IOException e) {
            throw ApiException.internal("Failed to store uploaded file: " + e.getMessage());
        }
    }

    @Override
    public byte[] load(String fileRef) {
        try {
            return s3.getObject(GetObjectRequest.builder().bucket(bucket).key(fileRef).build()).readAllBytes();
        } catch (Exception e) {
            throw ApiException.notFound("File not found: " + fileRef);
        }
    }

    @Override
    public void delete(String fileRef) {
        try {
            s3.deleteObject(DeleteObjectRequest.builder().bucket(bucket).key(fileRef).build());
        } catch (Exception e) {
            log.warn("Failed to delete stored file '{}': {}", fileRef, e.getMessage());
        }
    }
}
