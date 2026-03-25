-- Adds Landmark-specific fields to the existing `markers` table.
-- Run this once before using the LGU Landmarks Map.

ALTER TABLE `markers`
  ADD COLUMN `address` TEXT DEFAULT NULL AFTER `description`,
  ADD COLUMN `landmark_images` TEXT DEFAULT NULL AFTER `image`;

