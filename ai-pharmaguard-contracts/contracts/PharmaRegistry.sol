// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title PharmaRegistry
 * @dev A smart contract to track the supply chain of medicines and flag counterfeits.
 * It acts as a public, immutable ledger for medicine scan events.
 */
contract PharmaRegistry {

    struct Scan {
        string location;
        string userType;
        uint256 timestamp;
    }

    // Mapping from a medicine's unique ID to its scan history
    mapping(string => Scan[]) private scanHistories;

    // Mapping to flag potentially counterfeit medicines
    mapping(string => bool) private isCounterfeit;

    // Event to be emitted when a new scan is logged
    event ScanLogged(string indexed medicineId, string location, string userType, uint256 timestamp);

    // Event to be emitted when a medicine is flagged as counterfeit
    event CounterfeitFlagged(string indexed medicineId);

    /**
     * @dev Logs a new scan event for a given medicine ID.
     * @param _medicineId The unique ID of the medicine.
     * @param _location The location of the scan.
     * @param _userType The type of user scanning (e.g., "PHARMACIST", "CONSUMER").
     */
    function logScan(string memory _medicineId, string memory _location, string memory _userType) public {
        scanHistories[_medicineId].push(Scan({
            location: _location,
            userType: _userType,
            timestamp: block.timestamp
        }));
        emit ScanLogged(_medicineId, _location, _userType, block.timestamp);
    }

    /**
     * @dev Flags a medicine as counterfeit.
     * @param _medicineId The unique ID of the medicine to flag.
     */
    function flagAsCounterfeit(string memory _medicineId) public {
        isCounterfeit[_medicineId] = true;
        emit CounterfeitFlagged(_medicineId);
    }

    /**
     * @dev Retrieves the entire scan history for a medicine.
     * @param _medicineId The unique ID of the medicine.
     * @return A dynamically-sized array of strings representing the scan history.
     */
    function getScanHistory(string memory _medicineId) public view returns (string[] memory) {
        Scan[] memory history = scanHistories[_medicineId];
        string[] memory historyStrings = new string[](history.length);

        for (uint i = 0; i < history.length; i++) {
            historyStrings[i] = string(abi.encodePacked(history[i].location, " (", history[i].userType, ")"));
        }
        return historyStrings;
    }

    /**
     * @dev Checks if a medicine has been flagged as counterfeit.
     * @param _medicineId The unique ID of the medicine.
     * @return true if the medicine is flagged, false otherwise.
     */
    function isFlagged(string memory _medicineId) public view returns (bool) {
        return isCounterfeit[_medicineId];
    }
}