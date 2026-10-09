-- EcoMart Complete MySQL Database Schema
-- Run this script in MySQL Workbench or via command line: mysql -u root -p < database.sql

CREATE DATABASE IF NOT EXISTS `ecomart` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `ecomart`;

-- 1. Users Table (Handles Customers, Vendors, Admins)
CREATE TABLE IF NOT EXISTS `users` (
  `id` VARCHAR(255) NOT NULL,
  `email` VARCHAR(255) NOT NULL UNIQUE,
  `password` TEXT NOT NULL,
  `role` VARCHAR(50) NOT NULL DEFAULT 'customer', -- 'customer', 'vendor', 'admin'
  `name` VARCHAR(255) NULL,
  `storeName` VARCHAR(255) NULL,
  `countryCode` VARCHAR(10) DEFAULT 'IN',
  `countryName` VARCHAR(100) DEFAULT 'India',
  `region` VARCHAR(100) NULL,
  `district` VARCHAR(100) NULL,
  `city` VARCHAR(100) NULL,
  `postalCode` VARCHAR(20) NULL,
  `lat` DOUBLE NULL,
  `lng` DOUBLE NULL,
  `currency` VARCHAR(10) DEFAULT 'INR',
  `verified` TINYINT(1) DEFAULT 1,
  `resetOtpCode` VARCHAR(20) NULL,
  `resetOtpExpiry` BIGINT NULL,
  `verificationStatus` VARCHAR(50) DEFAULT 'Verified', -- 'Pending', 'Verified', 'Rejected'
  `about` TEXT NULL,
  `rating` DOUBLE DEFAULT 5.0,
  `completedOrders` INT DEFAULT 0,
  `greenPoints` INT DEFAULT 0,
  `upiId` TEXT NULL,
  `accountHolderName` VARCHAR(255) NULL,
  `accountNumber` VARCHAR(255) NULL,
  `ifscCode` VARCHAR(50) NULL,
  `panNumber` VARCHAR(50) NULL,
  `gstin` VARCHAR(50) NULL,
  `createdAt` VARCHAR(100) NULL,
  `updatedAt` VARCHAR(100) NULL,
  PRIMARY KEY (`id`),
  INDEX `idx_users_role` (`role`),
  INDEX `idx_users_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2. Email OTP Table (Registration & Password Reset)
CREATE TABLE IF NOT EXISTS `email_otps` (
  `id` VARCHAR(255) NOT NULL,
  `email` VARCHAR(255) NOT NULL,
  `otp` VARCHAR(20) NOT NULL,
  `purpose` VARCHAR(50) NOT NULL, -- 'registration', 'password_reset'
  `verified` TINYINT(1) DEFAULT 0,
  `attempts` INT DEFAULT 0,
  `expiresAt` BIGINT NOT NULL,
  `createdAt` VARCHAR(100) NULL,
  `updatedAt` VARCHAR(100) NULL,
  PRIMARY KEY (`id`),
  INDEX `idx_email_otps` (`email`, `purpose`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3. Products Table
CREATE TABLE IF NOT EXISTS `products` (
  `id` VARCHAR(255) NOT NULL,
  `vendorId` VARCHAR(255) NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `category` VARCHAR(100) NOT NULL,
  `grade` VARCHAR(100) DEFAULT 'A',
  `price` DOUBLE NOT NULL,
  `currency` VARCHAR(10) DEFAULT 'INR',
  `unit` VARCHAR(50) DEFAULT 'piece',
  `stock` INT NOT NULL DEFAULT 0,
  `countryCode` VARCHAR(10) DEFAULT 'IN',
  `region` VARCHAR(100) NULL,
  `district` VARCHAR(100) NULL,
  `city` VARCHAR(100) NULL,
  `lat` DOUBLE NULL,
  `lng` DOUBLE NULL,
  `description` TEXT NULL,
  `imageUrl` TEXT NULL,
  `images` TEXT NULL,
  `moq` INT DEFAULT 1,
  `tierPrices` TEXT NULL,
  `organic` TINYINT(1) DEFAULT 0,
  `harvestDate` VARCHAR(100) NULL,
  `materialType` VARCHAR(100) DEFAULT 'standard',
  `packagingType` VARCHAR(100) DEFAULT 'minimal_plastic',
  `recyclability` INT DEFAULT 80,
  `isRenewableEnergy` TINYINT(1) DEFAULT 0,
  `lifespanYears` DOUBLE DEFAULT 2.0,
  `ecoScore` INT DEFAULT 0,
  `co2SavedKg` DOUBLE DEFAULT 0,
  `plasticSavedKg` DOUBLE DEFAULT 0,
  `waterSavedLiters` DOUBLE DEFAULT 0,
  `treesEquivalent` DOUBLE DEFAULT 0,
  `rating` DOUBLE DEFAULT 0,
  `numReviews` INT DEFAULT 0,
  `status` VARCHAR(50) DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
  `rejectionReason` TEXT NULL,
  `createdAt` VARCHAR(100) NULL,
  `updatedAt` VARCHAR(100) NULL,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`vendorId`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  INDEX `idx_products_vendor` (`vendorId`),
  INDEX `idx_products_status` (`status`),
  INDEX `idx_products_category` (`category`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 4. Cart Table
CREATE TABLE IF NOT EXISTS `cart` (
  `id` VARCHAR(255) NOT NULL,
  `userId` VARCHAR(255) NOT NULL,
  `productId` VARCHAR(255) NOT NULL,
  `quantity` INT NOT NULL DEFAULT 1,
  `createdAt` VARCHAR(100) NULL,
  `updatedAt` VARCHAR(100) NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_user_product` (`userId`, `productId`),
  FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  FOREIGN KEY (`productId`) REFERENCES `products` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 5. Wishlist Table
CREATE TABLE IF NOT EXISTS `wishlist` (
  `id` VARCHAR(255) NOT NULL,
  `userId` VARCHAR(255) NOT NULL,
  `productId` VARCHAR(255) NOT NULL,
  `createdAt` VARCHAR(100) NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_wishlist_user_product` (`userId`, `productId`),
  FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  FOREIGN KEY (`productId`) REFERENCES `products` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 6. Orders Table
CREATE TABLE IF NOT EXISTS `orders` (
  `id` VARCHAR(255) NOT NULL,
  `customerId` VARCHAR(255) NULL,
  `customerName` VARCHAR(255) NULL,
  `deliveryCountry` VARCHAR(100) DEFAULT 'India',
  `deliveryRegion` VARCHAR(100) NULL,
  `deliveryDistrict` VARCHAR(100) NULL,
  `deliveryCity` VARCHAR(100) NULL,
  `deliveryPostalCode` VARCHAR(20) NULL,
  `deliveryAddress` TEXT NULL,
  `paymentMethod` VARCHAR(100) DEFAULT 'Razorpay',
  `totalAmount` DOUBLE NOT NULL,
  `currency` VARCHAR(10) DEFAULT 'INR',
  `status` VARCHAR(50) DEFAULT 'Pending', -- 'Pending', 'Packed', 'Shipped', 'Out for Delivery', 'Delivered', 'Cancelled'
  `paymentStatus` VARCHAR(50) DEFAULT 'pending', -- 'pending', 'paid', 'failed'
  `paymentVerifiedAt` VARCHAR(100) NULL,
  `paymentFailureReason` TEXT NULL,
  `greenPointsEarned` INT DEFAULT 0,
  `razorpayOrderId` VARCHAR(255) NULL,
  `razorpayPaymentId` VARCHAR(255) NULL,
  `razorpaySignature` VARCHAR(255) NULL,
  `vendorPayoutStatus` VARCHAR(50) DEFAULT 'not_started',
  `createdAt` VARCHAR(100) NULL,
  `updatedAt` VARCHAR(100) NULL,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`customerId`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  INDEX `idx_orders_customer` (`customerId`),
  INDEX `idx_orders_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 7. Order Items Table
CREATE TABLE IF NOT EXISTS `order_items` (
  `id` VARCHAR(255) NOT NULL,
  `orderId` VARCHAR(255) NOT NULL,
  `productId` VARCHAR(255) NULL,
  `vendorId` VARCHAR(255) NULL,
  `qty` INT NOT NULL,
  `unitPrice` DOUBLE NOT NULL,
  `amount` DOUBLE NOT NULL,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`orderId`) REFERENCES `orders` (`id`) ON DELETE CASCADE,
  FOREIGN KEY (`productId`) REFERENCES `products` (`id`) ON DELETE SET NULL,
  FOREIGN KEY (`vendorId`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  INDEX `idx_order_items_order` (`orderId`),
  INDEX `idx_order_items_vendor` (`vendorId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 8. Reviews Table
CREATE TABLE IF NOT EXISTS `reviews` (
  `id` VARCHAR(255) NOT NULL,
  `productId` VARCHAR(255) NOT NULL,
  `vendorId` VARCHAR(255) NULL,
  `customerId` VARCHAR(255) NULL,
  `customerName` VARCHAR(255) NULL,
  `rating` INT NOT NULL DEFAULT 5,
  `comment` TEXT NULL,
  `verifiedPurchase` TINYINT(1) DEFAULT 0,
  `status` VARCHAR(50) DEFAULT 'Approved',
  `createdAt` VARCHAR(100) NULL,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`productId`) REFERENCES `products` (`id`) ON DELETE CASCADE,
  FOREIGN KEY (`vendorId`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  FOREIGN KEY (`customerId`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 9. Notifications Table
CREATE TABLE IF NOT EXISTS `notifications` (
  `id` VARCHAR(255) NOT NULL,
  `userId` VARCHAR(255) NOT NULL,
  `text` TEXT NOT NULL,
  `type` VARCHAR(100) DEFAULT 'system',
  `read` TINYINT(1) DEFAULT 0,
  `createdAt` VARCHAR(100) NULL,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  INDEX `idx_notifications_user` (`userId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 10. Coupons Table
CREATE TABLE IF NOT EXISTS `coupons` (
  `id` VARCHAR(255) NOT NULL,
  `code` VARCHAR(100) NOT NULL UNIQUE,
  `description` TEXT NULL,
  `discountPercentage` DOUBLE NOT NULL,
  `pointsRequired` INT NOT NULL,
  `isActive` TINYINT(1) DEFAULT 1,
  `createdAt` VARCHAR(100) NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 11. Rewards Table
CREATE TABLE IF NOT EXISTS `rewards` (
  `id` VARCHAR(255) NOT NULL,
  `userId` VARCHAR(255) NOT NULL,
  `pointsEarned` INT NOT NULL DEFAULT 0,
  `pointsRedeemed` INT NOT NULL DEFAULT 0,
  `treesPlanted` INT NOT NULL DEFAULT 0,
  `createdAt` VARCHAR(100) NULL,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 12. AI Scan History Table
CREATE TABLE IF NOT EXISTS `scan_history` (
  `id` VARCHAR(255) NOT NULL,
  `userId` VARCHAR(255) NOT NULL,
  `scannedImage` LONGTEXT NULL,
  `detectedProduct` VARCHAR(255) NULL,
  `category` VARCHAR(100) NULL,
  `material` VARCHAR(100) NULL,
  `packagingType` VARCHAR(100) NULL,
  `recyclability` INT DEFAULT 50,
  `ecoScore` INT DEFAULT 50,
  `carbonImpact` VARCHAR(50) NULL,
  `confidenceScore` INT DEFAULT 90,
  `aiExplanation` TEXT NULL,
  `recommendationIds` TEXT NULL,
  `scannedAt` VARCHAR(100) NULL,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 13. Voice Assistant History Table
CREATE TABLE IF NOT EXISTS `voice_history` (
  `id` VARCHAR(255) NOT NULL,
  `userId` VARCHAR(255) NOT NULL,
  `userTranscript` TEXT NOT NULL,
  `detectedLanguage` VARCHAR(20) DEFAULT 'en-US',
  `aiResponseText` TEXT NOT NULL,
  `actionTriggered` VARCHAR(100) NULL,
  `createdAt` VARCHAR(100) NULL,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 14. Customer Addresses Table
CREATE TABLE IF NOT EXISTS `addresses` (
  `id` VARCHAR(255) NOT NULL,
  `userId` VARCHAR(255) NOT NULL,
  `fullName` VARCHAR(255) NOT NULL,
  `phone` VARCHAR(50) NOT NULL,
  `addressLine` TEXT NOT NULL,
  `city` VARCHAR(100) NOT NULL,
  `district` VARCHAR(100) NULL,
  `state` VARCHAR(100) NOT NULL,
  `postalCode` VARCHAR(20) NOT NULL,
  `country` VARCHAR(100) DEFAULT 'India',
  `isDefault` TINYINT(1) DEFAULT 0,
  `createdAt` VARCHAR(100) NULL,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 15. Refresh Tokens Table
CREATE TABLE IF NOT EXISTS `refresh_tokens` (
  `id` VARCHAR(255) NOT NULL,
  `userId` VARCHAR(255) NOT NULL,
  `token` TEXT NOT NULL,
  `expiresAt` BIGINT NOT NULL,
  `createdAt` VARCHAR(100) NULL,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 16. Support Tickets Table
CREATE TABLE IF NOT EXISTS `support_tickets` (
  `id` VARCHAR(255) NOT NULL,
  `userId` VARCHAR(255) NOT NULL,
  `subject` VARCHAR(255) NOT NULL,
  `message` TEXT NOT NULL,
  `status` VARCHAR(50) DEFAULT 'Open', -- 'Open', 'In Progress', 'Resolved', 'Closed'
  `priority` VARCHAR(20) DEFAULT 'Normal',
  `createdAt` VARCHAR(100) NULL,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 17. Eco Dashboard Logs Table
CREATE TABLE IF NOT EXISTS `eco_dashboard_logs` (
  `id` VARCHAR(255) NOT NULL,
  `userId` VARCHAR(255) NOT NULL,
  `action` VARCHAR(100) NOT NULL,
  `co2SavedKg` DOUBLE DEFAULT 0,
  `plasticSavedKg` DOUBLE DEFAULT 0,
  `waterSavedLiters` DOUBLE DEFAULT 0,
  `treesEquivalent` DOUBLE DEFAULT 0,
  `createdAt` VARCHAR(100) NULL,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 18. AI Voice Explainer Product History Table
CREATE TABLE IF NOT EXISTS `ai_voice_history` (
  `id` VARCHAR(255) NOT NULL,
  `userId` VARCHAR(255) NOT NULL,
  `productId` VARCHAR(255) NOT NULL,
  `question` TEXT NOT NULL,
  `aiAnswer` TEXT NOT NULL,
  `language` VARCHAR(20) DEFAULT 'en-US',
  `createdAt` VARCHAR(100) NULL,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`productId`) REFERENCES `products` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 19. Offers Table (Vendor Discounts & Promotional Campaigns)
CREATE TABLE IF NOT EXISTS `offers` (
  `id` VARCHAR(255) NOT NULL,
  `vendorId` VARCHAR(255) NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `description` TEXT NULL,
  `type` VARCHAR(50) DEFAULT 'percentage', -- 'percentage', 'fixed'
  `discountValue` DOUBLE NOT NULL,
  `productIds` TEXT NOT NULL, -- JSON array of product IDs
  `couponCode` VARCHAR(100) NULL,
  `startDate` VARCHAR(100) NOT NULL,
  `endDate` VARCHAR(100) NOT NULL,
  `status` VARCHAR(50) DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
  `rejectionReason` TEXT NULL,
  `createdAt` VARCHAR(100) NULL,
  `updatedAt` VARCHAR(100) NULL,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`vendorId`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


