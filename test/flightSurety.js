
var Test = require('../config/testConfig.js');
var BigNumber = require('bignumber.js');

contract('Flight Surety Tests', async (accounts) => {

    var config;
    before('setup contract', async () => {
        config = await Test.Config(accounts);
        await config.flightSuretyData.authorizeAppContract(config.flightSuretyApp.address);
    });

    /****************************************************************************************/
    /* Operations and Settings                                                              */
    /****************************************************************************************/

    it(`(multiparty) has correct initial isOperational() value`, async function () {

        // Get operating status
        let status = await config.flightSuretyData.isOperational.call();
        assert.equal(status, true, "Incorrect initial operating status value");

    });

    it(`(multiparty) can block access to setOperatingStatus() for non-Contract Owner account`, async function () {

        // Ensure that access is denied for non-Contract Owner account
        let accessDenied = false;
        try {
            await config.flightSuretyData.setOperatingStatus(false, { from: config.testAddresses[2] });
        }
        catch (e) {
            accessDenied = true;
        }
        assert.equal(accessDenied, true, "Access not restricted to Contract Owner");

    });

    it(`(multiparty) can allow access to setOperatingStatus() for Contract Owner account`, async function () {

        // Ensure that access is allowed for Contract Owner account
        let accessDenied = false;
        try {
            await config.flightSuretyData.setOperatingStatus(false);
        }
        catch (e) {
            accessDenied = true;
        }
        assert.equal(accessDenied, false, "Access not restricted to Contract Owner");

    });

    it(`(multiparty) can block access to functions using requireIsOperational when operating status is false`, async function () {

        await config.flightSuretyData.setOperatingStatus(false);

        let reverted = false;
        try {
            await config.flightSurety.setOperatingStatus(true);
        }
        catch (e) {
            reverted = true;
        }
        assert.equal(reverted, true, "Access not blocked for requireIsOperational");

        // Set it back for other tests to work
        await config.flightSuretyData.setOperatingStatus(true);

    });

    it('(airline) cannot register an Airline using registerAirline() if it is not funded', async () => {

        // ARRANGE
        let newAirline = accounts[2];

        // ACT
        try {
            await config.flightSuretyApp.registerAirline(newAirline, { from: config.firstAirline });
        }
        catch (e) {

        }
        let result = await config.flightSuretyData.isAirline.call(newAirline);

        // ASSERT
        assert.equal(result, false, "Airline should not be able to register another airline if it hasn't provided funding");

    });

    it('(Data Contract) Airline can fund', async () => {
        await config.flightSuretyApp.fund({ from: config.firstAirline, value: config.minAllowedFund })
        let airlineInfo = await config.flightSuretyData.getAirlineInfo(config.firstAirline);
        assert(airlineInfo[1]/*Is Funded*/, 'Airline isn\'t funded');
    })

    it('(Data Contract) Can add an app contract to list of authorized contracts', async () => {
        assert.equal(await config.flightSuretyData.authorizedContracts.call(config.testAddresses[3]), false)
        await config.flightSuretyData.authorizeAppContract(config.testAddresses[3])
        assert(await config.flightSuretyData.authorizedContracts.call(config.testAddresses[3]))
    });

    it('(multiparty) After registration of 4 airlines, At least 1/2 of airlines must vote for new airline registration', async () => {
        await config.flightSuretyApp.registerAirline(accounts[2], { from: config.firstAirline })
        await config.flightSuretyApp.registerAirline(accounts[3], { from: config.firstAirline })
        await config.flightSuretyApp.registerAirline(accounts[4], { from: config.firstAirline })
        assert.equal(await config.flightSuretyData.registeredAirlinesCount.call(), 4)

        await config.flightSuretyApp.registerAirline(accounts[5], { from: config.firstAirline })
        const airlineInfo = await config.flightSuretyApp.airlines.call(accounts[5])
        assert((await airlineInfo.approvedBy.length) == 1, 'Approved list should contain 1 approver')
        assert.equal(await airlineInfo.registered, false, 'Airline #5 registered should be false')

        // airline shouldn't be able to vote twice
        try {
            await config.flightSuretyApp.registerAirline(accounts[5], { from: config.firstAirline })
        } catch (error) {

        }

        await config.flightSuretyApp.registerAirline(accounts[5], { from: accounts[4] })

        airline = await config.flightSuretyData.airlines.call(accounts[5])
        assert(await airline.registered, 'Airline #5 isn\'t registered')
    });

    it('Can register flight', async () => {
        let flightTimestamp = new Date();
        flightTimestamp.setDate(flightTimestamp.getDate() + 3);
        await config.flightSuretyApp.registerFlight("ND1309", flightTimestamp, { from: config.firstAirline });

        let flightKey = await config.flightSuretyData.getFlightKey(config.firstAirline, "ND1309", flightTimestamp);
        let flight = await config.flightSuretyData.flights.call(flightKey)
        assert(flight.isRegistered, 'Flight isn\'t registered')
    });

});
