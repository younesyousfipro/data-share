package io.github.younesyousfipro.datashare.repository;

import io.github.younesyousfipro.datashare.model.Account;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface AccountRepository extends JpaRepository<Account, Long> {

	boolean existsByEmail(String email);

	Optional<Account> findByEmail(String email);

}
