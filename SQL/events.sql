-- Events table for LGU-created festivities
-- Run this in the leaflet_map database

CREATE TABLE IF NOT EXISTS `events` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `event_name` varchar(255) NOT NULL,
  `start_date` date NOT NULL,
  `end_date` date NOT NULL,
  `location` varchar(255) NOT NULL,
  `event_image_display` varchar(255) DEFAULT NULL COMMENT 'Card background image for tourist view',
  `event_plan` varchar(255) DEFAULT NULL COMMENT 'Optional full details/plan image',
  `polygon_id` int(11) DEFAULT NULL COMMENT 'FK to polygons - Ongoing Event Parameter',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `fk_events_polygon` (`polygon_id`),
  CONSTRAINT `fk_events_polygon` FOREIGN KEY (`polygon_id`) REFERENCES `polygons` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
