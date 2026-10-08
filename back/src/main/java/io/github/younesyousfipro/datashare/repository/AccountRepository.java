package io.github.younesyousfipro.datashare.repository;

import io.github.younesyousfipro.datashare.model.Account;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AccountRepository extends JpaRepository<Account, Long> {

	boolean existsByEmail(String email);

}
