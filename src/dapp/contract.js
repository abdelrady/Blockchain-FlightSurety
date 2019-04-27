import FlightSuretyApp from '../../build/contracts/FlightSuretyApp.json';
import Config from './config.json';
import Web3 from 'web3';

export default class Contract {
    constructor(network, callback) {

        let config = Config[network];
        this.firstAirline = config.firstAirline;
        this.web3 = new Web3(new Web3.providers.HttpProvider(config.url));
        this.flightSuretyApp = new this.web3.eth.Contract(FlightSuretyApp.abi, config.appAddress);
        this.initialize(callback);
        this.owner = null;
        this.airlines = [];
        this.passengers = [];
        this.gasLimit = this.web3.utils.toHex(4712388);
        this.gasPrice = this.web3.utils.toHex(this.web3.utils.toWei('10', 'gwei'));
        this.serverPath = 'http://localhost:3000/';
    }

    initialize(callback) {
        this.web3.eth.getAccounts((error, accts) => {

            if (error) return;

            this.owner = accts[0];

            let counter = 1;

            while (this.airlines.length < 5) {
                let airline = { id: accts[counter++], name: 'Airplane #' + (counter - 1) };
                this.airlines.push(airline);
                try {
                    this.flightSuretyApp.methods.registerAirline(airline.id, airline.name)
                        .send({ from: this.firstAirline })
                }
                catch (err) {
                }
            }

            while (this.passengers.length < 5) {
                this.passengers.push(accts[counter++]);
            }

            callback();
        });
    }

    isOperational(callback) {
        let self = this;
        self.flightSuretyApp.methods
            .isOperational()
            .call({ from: self.owner }, callback);
    }

    fetchFlightStatus(flight, airline, flightTimestamp, callback) {
        let self = this;
        let payload = {
            airline: airline,
            flight: flight,
            timestamp: flightTimestamp
        };
        self.flightSuretyApp.methods
            .fetchFlightStatus(payload.airline, payload.flight, payload.timestamp)
            .send({ from: self.owner }, (error, result) => {
                callback(error, payload);
            });
    }

    getAirlines() {
        return this.airlines;
    }

    fetchFlightsFromServer(callback) {
        fetch(this.serverPath + 'airplanes/flights')
            .then(res => res.json())
            .then(callback);
    }

    buyInsurance(airline, flight, timestamp, amount, callback) {
        amount = this.web3.utils.toWei(amount, 'ether');
        this.flightSuretyApp.methods
            .buy(airline, flight, timestamp)
            .send({ from: this.passengers[0], value: amount }, (error, result) => {
                if (callback) callback(error, result);
            });
    }

    submitAirlineFund(airline, amount, callback) {
        amount = this.web3.utils.toWei(amount, 'ether');
        this.flightSuretyApp.methods
            .fund()
            .send({ from: airline, value: amount }, (error, result) => {
                // register 2 flights per airline
                let flightTimestamp = Math.floor(Date.now() / 1000);
                this.flightSuretyApp.methods.registerFlight('FL-A-' + flightTimestamp, flightTimestamp)
                    .send({ from: airline, gas: this.gasLimit, gasPrice: this.gasPrice }, (err, res) => {
                        if (callback) callback(error, result);
                    })
            });
    }

    checkBalance(callback) {
        fetch(this.serverPath + 'passenger/' + this.passengers[0] + '/balance')
            .then(res => res.json())
            .then(callback);
    }

}