package com.piquenozap.piquenozapbackend.repository;

import com.piquenozap.piquenozapbackend.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByEmail(String email);

    @Query("SELECT u FROM User u LEFT JOIN FETCH u.groups WHERE u.email = :email")
    Optional<User> findByEmailWithGroups(@Param("email") String email);

    // NOVO MÉTODO: Busca o usuário e sua lista de bloqueados
    @Query("SELECT u FROM User u LEFT JOIN FETCH u.blockedUsers WHERE u.email = :email")
    Optional<User> findByEmailWithBlockedUsers(@Param("email") String email);
}