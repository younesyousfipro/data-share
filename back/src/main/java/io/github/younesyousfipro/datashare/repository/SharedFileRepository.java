package io.github.younesyousfipro.datashare.repository;

import io.github.younesyousfipro.datashare.model.SharedFile;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface SharedFileRepository extends JpaRepository<SharedFile, UUID> {

	List<SharedFile> findByAccountIdOrderByUploadedAtDesc(Long accountId);

}
