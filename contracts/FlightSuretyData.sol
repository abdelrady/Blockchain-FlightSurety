pragma solidity ^0.4.25;

import "../node_modules/openzeppelin-solidity/contracts/math/SafeMath.sol";

contract FlightSuretyData {
    using SafeMath for uint256;

    /********************************************************************************************/
    /*                                       DATA VARIABLES                                     */
    /********************************************************************************************/
    
    // Flight status codees
    uint8 private constant STATUS_CODE_UNKNOWN = 0;
    uint8 private constant STATUS_CODE_ON_TIME = 10;
    uint8 private constant STATUS_CODE_LATE_AIRLINE = 20;
    uint8 private constant STATUS_CODE_LATE_WEATHER = 30;
    uint8 private constant STATUS_CODE_LATE_TECHNICAL = 40;
    uint8 private constant STATUS_CODE_LATE_OTHER = 50;

    struct AirlineInfo {
        bool isRegistered;
        bool isFunded;
        string name;
        address[] approvedBy;
    }

    struct Flight {
        bool isRegistered;
        uint8 statusCode;
        uint256 updatedTimestamp;        
        address airline;
        string flight;
        address[] insuredPassengers;
        mapping(address => uint256) passengersPaymentAmount;
    }
    mapping(bytes32 => Flight) public flights;
    
    address private contractOwner;                                      // Account used to deploy contract
    bool private operational = true;                                    // Blocks all state changes throughout the contract if false
    uint256 public registeredAirlinesCount = 1;
    mapping(address => AirlineInfo) public airlines;
    mapping(address => uint256) public passengersBalances;
    mapping(address => bool) public authorizedContracts;
    mapping(address => uint256) public insurees;
    //address constant firstAirlineAddress = 0x954cB087C29cf91FDFfd6A144F2F7bBc8b87e1bA;


    /********************************************************************************************/
    /*                                       EVENT DEFINITIONS                                  */
    /********************************************************************************************/
    event FlightStatusUpdated(bytes32 flightKey, uint8 status, uint256 passengersCount);
    event AmountRefundedToPassengerBalance(address passenger, uint256 refundAmount);

    /**
    * @dev Constructor
    *      The deploying account becomes contractOwner
    */
    constructor
                                (
                                    address firstAirlineAddress
                                ) 
                                public 
    {
        contractOwner = msg.sender;
        airlines[firstAirlineAddress] = AirlineInfo({
         isRegistered: true,
         approvedBy: new address[](0),
         isFunded: false,
         name: 'Test Airlines'
        });
        registeredAirlinesCount = 1;
    }

    /********************************************************************************************/
    /*                                       FUNCTION MODIFIERS                                 */
    /********************************************************************************************/

    // Modifiers help avoid duplication of code. They are typically used to validate something
    // before a function is allowed to be executed.

    /**
    * @dev Modifier that requires the "operational" boolean variable to be "true"
    *      This is used on all state changing functions to pause the contract in 
    *      the event there is an issue that needs to be fixed
    */
    modifier requireIsOperational() 
    {
        require(operational, "Contract is currently not operational");
        _;  // All modifiers require an "_" which indicates where the function body will be added
    }

    /**
    * @dev Modifier that requires the "ContractOwner" account to be the function caller
    */
    modifier requireContractOwner()
    {
        require(msg.sender == contractOwner, "Caller is not contract owner");
        _;
    }

    modifier requireValidAddress(address account)
    {
        require(account != address(0), "'account' must be a valid address.");
        _;
    }

    // Only our app contract is allowed to call this data contract
     modifier requireAuthorizedCaller() {
        require(authorizedContracts[msg.sender] == true, "Call origin is not authorized to access this contract.");
        _;
    }

    /********************************************************************************************/
    /*                                       UTILITY FUNCTIONS                                  */
    /********************************************************************************************/

    /**
    * @dev Get operating status of contract
    *
    * @return A bool that is the current operating status
    */      
    function isOperational() 
                            public 
                            view 
                            returns(bool) 
    {
        return operational;
    }


    /**
    * @dev Sets contract operations on/off
    *
    * When operational mode is disabled, all write transactions except for this one will fail
    */    
    function setOperatingStatus
                            (
                                bool mode
                            ) 
                            external
                            requireContractOwner 
    {
        operational = mode;
    }

    // Allow contract owner to add a list of authorized contracts
    function authorizeAppContract(address contractAddress)
    external
    requireIsOperational
    requireContractOwner
    {
        authorizedContracts[contractAddress] = true;
    }

    function isAirline(
        address airline
    )
    external
    returns (bool)
    {
        return airlines[airline].isRegistered;
    }

    function getRegisteredAirlinesCount()
    external
    returns (uint256)
    {
        return registeredAirlinesCount;
    }

    function getAirlineInfo(address airline)
    external
    returns (bool isRegistered, bool isFunded, uint256 approvedByLength)
    {
        isRegistered = airlines[airline].isRegistered;
        isFunded = airlines[airline].isRegistered;
        approvedByLength = airlines[airline].approvedBy.length;
    }

    function getAirlineApprovalList(address airline)
    external
    returns (address[])
    {
        return airlines[airline].approvedBy;
    }

    function getPassengerInsuredAmount(address airline,
                            string flight,
                            uint256 timestamp,
                            address passenger)
    external
    returns (uint256)
    {
        bytes32 flightKey = getFlightKey(airline, flight, timestamp);
        return flights[flightKey].passengersPaymentAmount[passenger];
    }
    
    
    /********************************************************************************************/
    /*                                     SMART CONTRACT FUNCTIONS                             */
    /********************************************************************************************/

   /**
    * @dev Add an airline to the registration queue
    *      Can only be called from FlightSuretyApp contract
    *
    */   
    function registerAirline
                            (   
                                address airline,
                                string name
                            )
                            external
                            requireIsOperational
                            requireValidAddress(airline)
    {
        airlines[airline].isRegistered = true;
        airlines[airline].name = name;
        registeredAirlinesCount = registeredAirlinesCount + 1;
    }

    function addToAirlineApprovalList(address airline, address approver)
    external
    {
        airlines[airline].approvedBy.push(approver);
    }


   /**
    * @dev Register a future flight for insuring.
    *
    */  
    function registerFlight
                                (
                                    string flight,
                                    address airline,
                                    uint256 timestamp
                                )
                                external
    {
        require(!flights[flightKey].isRegistered, "Flight is already registered.");
        bytes32 flightKey = getFlightKey(airline, flight, timestamp);
        flights[flightKey] = Flight({
            isRegistered: true,
            updatedTimestamp: timestamp,
            airline: airline,
            flight: flight,
            statusCode: STATUS_CODE_UNKNOWN,
            insuredPassengers: new address[](0)
        });
    }

    function processFlightStatus
                                (
                                    bytes32 flightKey,
                                    uint8 statusCode
                                )
                                external
    {
        Flight memory flight = flights[flightKey];
        //require(flight.statusCode != statusCode, "Flight already processed");
        require(flight.isRegistered, "Flight isn't registered");
        //require(flight.statusCode == STATUS_CODE_UNKNOWN, "Flight isn't registered");

        flights[flightKey].statusCode = statusCode;
        emit FlightStatusUpdated(flightKey, statusCode, flight.insuredPassengers.length);
        if (statusCode == 20) {
            creditInsurees(flightKey);
        }
    }
    
   /**
    * @dev Buy insurance for a flight
    *
    */   
    function buy
                            (
                                bytes32 flightKey, 
                                address passenger
                            )
                            external
                            payable
    {
        require(flights[flightKey].isRegistered, "Flight isn't registered.");
        // require(flights[flightKey].passengersPaymentAmount[passenger] == 0, "Passenger can't insure multiple times for same airplane/flight");

        flights[flightKey].passengersPaymentAmount[passenger] = uint256(msg.value);
        flights[flightKey].insuredPassengers.push(passenger);
    }

    /**
     *  @dev Credits payouts to insurees
    */
    function creditInsurees
                                (
                                    bytes32 flightKey
                                )
                                internal
    {
        Flight flight = flights[flightKey];
        require(flight.isRegistered, "Flight isn't registered.");

        for (uint a = 0; a < flight.insuredPassengers.length; a++) {
            address passenger = flight.insuredPassengers[a];
            uint256 refundAmount = flights[flightKey].passengersPaymentAmount[passenger].mul(3).div(2);
            emit AmountRefundedToPassengerBalance(passenger, refundAmount);
            passengersBalances[passenger] = passengersBalances[passenger].add(refundAmount);
        }
    }
    

    /**
     *  @dev Transfers eligible payout funds to insuree
     *
    */
    function pay
                            (
                                address account
                            )
                            external
                            
    {
        require(passengersBalances[account] > 0, "No refund amount for this passenger");

        uint256 value = passengersBalances[account];
        passengersBalances[account] = 0;
        account.transfer(value);
    }

   /**
    * @dev Initial funding for the insurance. Unless there are too many delayed flights
    *      resulting in insurance payouts, the contract should be self-sustaining
    *
    */   
    function fund
                            (   
                                address airline
                            )
                            public
                            payable
    {
        airlines[airline].isFunded = true;
    }

    function getFlightKey
                        (
                            address airline,
                            string flight,
                            uint256 timestamp
                        )
                        pure
                        public
                        returns(bytes32) 
    {
        return keccak256(abi.encodePacked(airline, flight, timestamp));
    }

    /**
    * @dev Fallback function for funding smart contract.
    *
    */
    function() 
                            external 
                            payable 
    {
        fund(tx.origin);
    }


}

