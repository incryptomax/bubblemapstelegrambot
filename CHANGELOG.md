# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [v0.2.0-alpha] - 2024-04-27

### Added
- Automatic chain detection for all supported networks
- Multi-chain contract validation for EVM addresses
- Improved user experience with live chain detection feedback

### Changed
- Updated chain detection to check contract validity across multiple chains
- Enhanced processing message flow during chain detection
- Updated documentation to reflect new automatic detection capabilities
- Simplified UI by removing the chain selection button
- Removed unnecessary reply buttons for cleaner interface

### Removed
- Chain selection button from the main menu
- Cancel button from broadcast message interface
- `/chain` command as it's no longer needed with automatic detection

## [v0.1.0-alpha] - 2024-03-21

### Added
- Initial Telegram bot implementation with core functionality
- Screenshot service for capturing Bubblemaps visualizations
- Support for multiple blockchain networks
- Modal and popup handling for clean screenshots
- User management system
- Admin commands for statistics and broadcasting
- Docker support with optimized configuration
- Comprehensive error handling and logging
- Environment-based configuration
- Graceful shutdown handling

### Features
- Automated screenshot capture of Bubblemaps pages
- Token information lookup by contract address
- Real-time market data integration
- Decentralization score and metrics
- Visual ownership distribution maps
- Automatic chain detection for Solana
- Support for multiple blockchain networks
- Intuitive Telegram interface
- Admin controls and statistics

### Supported Networks
- Ethereum (ETH)
- BNB Smart Chain (BSC)
- Fantom (FTM)
- Avalanche (AVAX)
- Cronos (CRO)
- Arbitrum (ARBI)
- Polygon (POLY)
- Base (BASE)
- Solana (SOL) - Auto-detected
- Sonic (SONIC)

### Technical Improvements
- Optimized screenshot capture process
- Enhanced modal handling with multiple strategies
- Improved error recovery mechanisms
- Docker container optimization
- MongoDB integration for data persistence
- Comprehensive logging system

### Notes
- This is an alpha release and may contain bugs
- Some features may be unstable or incomplete
- Feedback and bug reports are welcome 