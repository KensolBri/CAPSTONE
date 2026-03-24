-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Dec 09, 2025 at 02:04 PM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `lokal_users`
--

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `id` int(11) NOT NULL,
  `full_name` varchar(100) NOT NULL,
  `email` varchar(100) NOT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `password` varchar(255) NOT NULL,
  `account_type` enum('tourist','lgu','vendor') NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`id`, `full_name`, `email`, `phone`, `password`, `account_type`, `created_at`) VALUES
(1, 'Daniel Padilla', 'danielpadilla@gmail.com', '09876543211', '$2y$10$ymtPQaRjWg0prPaUcZDD3.09CLc4Yx9.pq.bSvNnO0UTRGbaQSO1u', 'tourist', '2025-11-12 10:52:34'),
(2, 'Joshua Garcia', 'joshuag@gmail.com', '09123456789', '$2y$10$pl2lLaK5n8ZWicsC1GGZwOGAAULM/Cx3P4N6dO4zjXbAgZ44Zss26', 'lgu', '2025-11-16 16:31:47'),
(3, 'Piolo Pascual', 'itspapaP@gmail.com', '12345678901', '$2y$10$eku6lwJtJLyYOEErzTCLge1LFeBiWju4.r21qWhhhCHGVuNTTJd0m', 'vendor', '2025-11-16 16:44:43'),
(4, 'Jasper Lindero Conlu', 'mrconlu@gmail.com', '09123456789', '$2y$10$toAnOMPTS0zYVz74EOEjWePHtjUbVqXvoewASR4CsMSC33z4xlBBm', 'tourist', '2025-11-26 06:21:56'),
(5, 'Randell Eduarth Erpelua Soteo', 'randellcond.soteo@gmail.com', '09781234567', '$2y$10$rN5WOnM6vosdmdWKDBC.ROv0pHyFbCcZf4S4ZqimKBDButMDhM1Lu', 'lgu', '2025-11-26 06:49:01'),
(6, 'Jasper Nyl Caballero', 'jncaballero@gmail.com', '12345678901', '$2y$10$mmH89JHHLDcX39eijIjzzOMnJY7WR5vBx6HHCtyKqgzu3zlQ.S23O', 'vendor', '2025-12-09 08:24:57');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `email` (`email`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
