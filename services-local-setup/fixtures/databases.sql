-- Synthetic local-only credentials; no application tables or patch SQL.
CREATE DATABASE IF NOT EXISTS userservice CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE IF NOT EXISTS tenantservice CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE IF NOT EXISTS agencyservice CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE IF NOT EXISTS consultingtypeservice CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS 'oriso_local'@'%' IDENTIFIED BY 'local-only-database';
GRANT ALL PRIVILEGES ON userservice.* TO 'oriso_local'@'%';
GRANT ALL PRIVILEGES ON tenantservice.* TO 'oriso_local'@'%';
GRANT ALL PRIVILEGES ON agencyservice.* TO 'oriso_local'@'%';
GRANT ALL PRIVILEGES ON consultingtypeservice.* TO 'oriso_local'@'%';
