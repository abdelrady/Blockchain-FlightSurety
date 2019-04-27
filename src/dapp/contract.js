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
    }

    initialize(callback) {
        this.web3.eth.getAccounts((error, accts) => {

            if (error) return;

            this.owner = accts[0];

            let counter = 1;

            while (this.airlines.length < 5) {
                let airline = { id: accts[counter++], name: 'Airplane #' + (counter - 1) };
                this.airlines.push(airline);
                this.flightSuretyApp.methods.registerAirline(airline.id, airline.name)
                    .send({ from: this.firstAirline })
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

    fetchFlightStatus(flight, callback) {
        let self = this;
        let payload = {
            airline: self.airlines[0],
            flight: flight,
            timestamp: Math.floor(Date.now() / 1000)
        }
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
        fetch('http://localhost:3000/airplanes/flights')
            .then(res => {
                let flights = res.json()
                callback(flights)
            });
    }

    submitAirlineFund(airline, amount, callback) {
        amount = this.web3.utils.toWei(amount, 'ether');
        this.flightSuretyApp.methods
            .fund()
            .send({ from: airline, value: amount }, (error, result) => {
                if (callback) callback(error, result);
                // register 2 flights per airline
                let flightTimestamp = Math.floor(Date.now() / 1000);
                this.flightSuretyApp.methods.registerFlight('FL-A-' + flightTimestamp, flightTimestamp)
                    .send({ from: airline.id })
                flightTimestamp = flightTimestamp + 1 * 24 * 60 * 60;
                this.flightSuretyApp.methods.registerFlight('FL-A-' + flightTimestamp, flightTimestamp)
                    .send({ from: airline.id })
            });



    }

}