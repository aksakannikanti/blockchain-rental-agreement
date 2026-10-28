// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title RentalAgreement
 * @dev Smart contract for managing blockchain-based rental agreements and oracle-verified payments.
 */
contract RentalAgreement {
    enum AgreementStatus {
        Pending,    // 0
        Accepted,   // 1
        Rejected,   // 2
        Expired,    // 3
        Terminated  // 4
    }

    struct Agreement {
        uint256 id;
        string propertyAddress;
        address landlord;
        address tenant;
        uint256 rentAmount;       // in Wei
        uint256 securityDeposit;  // in Wei
        uint256 startDate;        // unix timestamp
        uint256 endDate;          // unix timestamp
        string terms;             // Agreement terms & conditions
        AgreementStatus status;
        uint256 createdAt;
    }

    struct PaymentRecord {
        uint256 agreementId;
        string paymentReference; // Unique external payment reference ID (e.g. PAY-12345)
        uint256 amount;           // Paid amount in Wei
        uint256 paymentTimestamp; // External payment timestamp (from gateway)
        uint256 recordedAt;       // Blockchain block timestamp
        address recordedBy;       // Address that recorded the payment (Oracle)
    }

    address public owner;
    address public oracleAddress;
    uint256 public agreementCounter;

    mapping(uint256 => Agreement) public agreements;
    mapping(uint256 => PaymentRecord[]) private agreementPayments;
    mapping(string => bool) public isPaymentProcessed; // Duplicate payment reference prevention

    mapping(address => uint256[]) private landlordAgreements;
    mapping(address => uint256[]) private tenantAgreements;

    // Events
    event AgreementCreated(
        uint256 indexed agreementId,
        address indexed landlord,
        address indexed tenant,
        string propertyAddress,
        uint256 rentAmount,
        uint256 securityDeposit,
        uint256 startDate,
        uint256 endDate
    );

    event AgreementAccepted(
        uint256 indexed agreementId,
        address indexed tenant,
        uint256 timestamp
    );

    event AgreementRejected(
        uint256 indexed agreementId,
        address indexed tenant,
        uint256 timestamp
    );

    event AgreementTerminated(
        uint256 indexed agreementId,
        address indexed initiatedBy,
        uint256 timestamp
    );

    event AgreementExpired(
        uint256 indexed agreementId,
        uint256 timestamp
    );

    event PaymentRecorded(
        uint256 indexed agreementId,
        string paymentReference,
        uint256 amount,
        uint256 paymentTimestamp,
        uint256 recordedAt,
        address indexed recordedBy
    );

    event OracleAddressUpdated(
        address indexed oldOracle,
        address indexed newOracle
    );

    // Modifiers
    modifier onlyOwner() {
        require(msg.sender == owner, "Only contract owner can perform this action");
        _;
    }

    modifier onlyOracle() {
        require(msg.sender == oracleAddress, "Caller is not the authorized Oracle service");
        _;
    }

    modifier agreementExists(uint256 _agreementId) {
        require(_agreementId > 0 && _agreementId <= agreementCounter, "Rental agreement does not exist");
        _;
    }

    constructor(address _oracleAddress) {
        require(_oracleAddress != address(0), "Invalid oracle address");
        owner = msg.sender;
        oracleAddress = _oracleAddress;
    }

    /**
     * @notice Updates the authorized Oracle address
     * @param _newOracle New address of the Oracle service
     */
    function updateOracleAddress(address _newOracle) external onlyOwner {
        require(_newOracle != address(0), "Invalid oracle address");
        address oldOracle = oracleAddress;
        oracleAddress = _newOracle;
        emit OracleAddressUpdated(oldOracle, _newOracle);
    }

    /**
     * @notice Creates a new rental agreement
     */
    function createAgreement(
        string memory _propertyAddress,
        address _tenant,
        uint256 _rentAmount,
        uint256 _securityDeposit,
        uint256 _startDate,
        uint256 _endDate,
        string memory _terms
    ) external returns (uint256) {
        require(bytes(_propertyAddress).length > 0, "Property address cannot be empty");
        require(_tenant != address(0), "Invalid tenant address");
        require(_tenant != msg.sender, "Landlord and tenant cannot be the same address");
        require(_rentAmount > 0, "Monthly rent must be greater than zero");
        require(_endDate > _startDate, "End date must be after start date");

        agreementCounter++;
        uint256 newAgreementId = agreementCounter;

        agreements[newAgreementId] = Agreement({
            id: newAgreementId,
            propertyAddress: _propertyAddress,
            landlord: msg.sender,
            tenant: _tenant,
            rentAmount: _rentAmount,
            securityDeposit: _securityDeposit,
            startDate: _startDate,
            endDate: _endDate,
            terms: _terms,
            status: AgreementStatus.Pending,
            createdAt: block.timestamp
        });

        landlordAgreements[msg.sender].push(newAgreementId);
        tenantAgreements[_tenant].push(newAgreementId);

        emit AgreementCreated(
            newAgreementId,
            msg.sender,
            _tenant,
            _propertyAddress,
            _rentAmount,
            _securityDeposit,
            _startDate,
            _endDate
        );

        return newAgreementId;
    }

    /**
     * @notice Tenant accepts a pending rental agreement
     */
    function acceptAgreement(uint256 _agreementId) external agreementExists(_agreementId) {
        Agreement storage agreement = agreements[_agreementId];
        require(
            msg.sender == agreement.tenant || msg.sender == owner,
            "Only designated tenant can accept this agreement"
        );
        require(agreement.status == AgreementStatus.Pending, "Agreement is not in Pending status");
        
        if (block.timestamp > agreement.endDate) {
            agreement.status = AgreementStatus.Expired;
            emit AgreementExpired(_agreementId, block.timestamp);
            revert("Agreement has already expired");
        }

        agreement.status = AgreementStatus.Accepted;
        emit AgreementAccepted(_agreementId, msg.sender, block.timestamp);
    }

    /**
     * @notice Tenant rejects a pending rental agreement
     */
    function rejectAgreement(uint256 _agreementId) external agreementExists(_agreementId) {
        Agreement storage agreement = agreements[_agreementId];
        require(
            msg.sender == agreement.tenant || msg.sender == owner,
            "Only designated tenant can reject this agreement"
        );
        require(agreement.status == AgreementStatus.Pending, "Agreement is not in Pending status");

        agreement.status = AgreementStatus.Rejected;
        emit AgreementRejected(_agreementId, msg.sender, block.timestamp);
    }

    /**
     * @notice Landlord terminates an accepted agreement
     */
    function terminateAgreement(uint256 _agreementId) external agreementExists(_agreementId) {
        Agreement storage agreement = agreements[_agreementId];
        require(
            msg.sender == agreement.landlord || msg.sender == owner,
            "Only landlord or contract owner can terminate this agreement"
        );
        require(agreement.status == AgreementStatus.Accepted, "Only Accepted agreements can be terminated");

        agreement.status = AgreementStatus.Terminated;
        emit AgreementTerminated(_agreementId, msg.sender, block.timestamp);
    }

    /**
     * @notice Check and update expiration if agreement duration has passed
     */
    function checkAndUpdateStatus(uint256 _agreementId) external agreementExists(_agreementId) returns (AgreementStatus) {
        Agreement storage agreement = agreements[_agreementId];
        if (
            (agreement.status == AgreementStatus.Pending || agreement.status == AgreementStatus.Accepted) &&
            block.timestamp > agreement.endDate
        ) {
            agreement.status = AgreementStatus.Expired;
            emit AgreementExpired(_agreementId, block.timestamp);
        }
        return agreement.status;
    }

    /**
     * @notice Oracle records a verified external rental payment
     * @param _agreementId ID of the rental agreement
     * @param _paymentReference Unique reference from payment gateway
     * @param _amount Amount paid in Wei
     * @param _paymentTimestamp Timestamp when payment was settled externally
     */
    function recordPayment(
        uint256 _agreementId,
        string memory _paymentReference,
        uint256 _amount,
        uint256 _paymentTimestamp
    ) external onlyOracle agreementExists(_agreementId) {
        require(bytes(_paymentReference).length > 0, "Payment reference cannot be empty");
        require(!isPaymentProcessed[_paymentReference], "Duplicate payment reference: Payment already recorded");
        
        Agreement storage agreement = agreements[_agreementId];
        require(agreement.status == AgreementStatus.Accepted, "Payments can only be recorded for Accepted agreements");
        require(_amount > 0, "Payment amount must be greater than zero");

        isPaymentProcessed[_paymentReference] = true;

        PaymentRecord memory newPayment = PaymentRecord({
            agreementId: _agreementId,
            paymentReference: _paymentReference,
            amount: _amount,
            paymentTimestamp: _paymentTimestamp,
            recordedAt: block.timestamp,
            recordedBy: msg.sender
        });

        agreementPayments[_agreementId].push(newPayment);

        emit PaymentRecorded(
            _agreementId,
            _paymentReference,
            _amount,
            _paymentTimestamp,
            block.timestamp,
            msg.sender
        );
    }

    /**
     * @notice Retrieve single agreement details
     */
    function getAgreement(uint256 _agreementId) external view agreementExists(_agreementId) returns (Agreement memory) {
        return agreements[_agreementId];
    }

    /**
     * @notice Retrieve payment history for an agreement
     */
    function getPaymentHistory(uint256 _agreementId) external view agreementExists(_agreementId) returns (PaymentRecord[] memory) {
        return agreementPayments[_agreementId];
    }

    /**
     * @notice Retrieve all agreements created by landlord
     */
    function getLandlordAgreements(address _landlord) external view returns (uint256[] memory) {
        return landlordAgreements[_landlord];
    }

    /**
     * @notice Retrieve all agreements assigned to tenant
     */
    function getTenantAgreements(address _tenant) external view returns (uint256[] memory) {
        return tenantAgreements[_tenant];
    }

    /**
     * @notice Get all agreements count
     */
    function getTotalAgreements() external view returns (uint256) {
        return agreementCounter;
    }
}
