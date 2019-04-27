
import DOM from './dom';
import Contract from './contract';
import './flightsurety.css';


(async () => {

    let result = null;

    let contract = new Contract('localhost', () => {

        // Read transaction
        contract.isOperational((error, result) => {
            console.log(error, result);
            display('Operational Status', 'Check if contract is operational', [{ label: 'Operational Status', error: error, value: result }]);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });

        // User-submitted transaction
        DOM.elid('submit-oracle').addEventListener('click', () => {
            let flightsList = DOM.elid('flights-list-2');
            let optionPayload = JSON.parse(flightsList.options[flightsList.selectedIndex].getAttribute("data-payload"));
            let flight = optionPayload.flight;
            let airline = optionPayload.airline;
            let flightTimestamp = optionPayload.timestamp;
            
            contract.fetchFlightStatus(flight, airline, flightTimestamp, (error, result) => {
                display('Oracles', 'Trigger oracles', [{ label: 'Fetch Flight Status', error: error, value: result.flight + ' ' + result.timestamp }]);
            });
            window.scrollTo({ top: 0, behavior: 'smooth' });

        })
        
        fillAirlines(contract.getAirlines())

        contract.fetchFlightsFromServer(fillFlightsOptions);
        
        DOM.elid('submit-fund').addEventListener('click', () => {
            let airline = DOM.elid('airline-fund-list-1').value;
            let amount = DOM.elid('airline-fund-value').value;
            contract.submitAirlineFund(airline, amount, (error, result) => {
                display('Airlines', 'Call Fund Airline', [{ label: 'Fund Airline', error: error, value: 'Airline funded successfully.' }], 'display-wrapper');
                contract.fetchFlightsFromServer(fillFlightsOptions);
            });
            window.scrollTo({ top: 0, behavior: 'smooth' });

        })

        DOM.elid('buy-insurance').addEventListener('click', () => {
            let flightsList = DOM.elid('flights-list-1');
            let optionPayload = JSON.parse(flightsList.options[flightsList.selectedIndex].getAttribute("data-payload"));
            let flight = optionPayload.flight;
            let airline = optionPayload.airline;
            let flightTimestamp = optionPayload.timestamp;
            let amount = DOM.elid('insurance-value').value;
            contract.buyInsurance(airline, flight, flightTimestamp, amount, (error, result) => {
                display('Buy Insurance', 'Call Buy Insurance', [{ label: 'Buy Insurance', error: error, value: 'Insurance bought successfully.' }], 'display-wrapper');
            });
            window.scrollTo({ top: 0, behavior: 'smooth' });

        })

        DOM.elid('claim-insurance').addEventListener('click', () => {
            contract.checkBalance((error, result) => {
                display('Check Balance', 'Call Server Api', [{ label: 'Check Balance for passenger', error: error, value: result.balance }], 'display-wrapper');
            });
            window.scrollTo({ top: 0, behavior: 'smooth' });
        })
        
    });
})();

function fillFlightsOptions(flights){
    let flightsSelect1 = DOM.elid('flights-list-1');
    var length = flightsSelect1.options.length;
    for (var i = 0; i < length; i++) {
        flightsSelect1.options[i] = null;
    }

    flights.forEach(a=>{
        let option = DOM.createOption(a.flight, a.flight + "-" + a.airline, a);
        flightsSelect1.appendChild(option); 
    });

    let flightsSelect2 = DOM.elid('flights-list-2');
    var length = flightsSelect2.options.length;
    for (var i = 0; i < length; i++) {
        flightsSelect2.options[i] = null;
    }

    flights.forEach(a=>{
        let option = DOM.createOption(a.flight, a.flight + "-" + a.airline, a);
        flightsSelect2.appendChild(option); 
    });

}
function fillAirlines(airlines) {
    let airlinesSelect1 = DOM.elid('airline-fund-list-1');
    var length = airlinesSelect1.options.length;
    for (var i = 0; i < length; i++) {
        airlinesSelect1.options[i] = null;
    }

    airlines.forEach(a=>{
        let option = DOM.createOption(a.name, a.id);
        airlinesSelect1.appendChild(option); 
    });
}

function display(title, description, results, element) {
    let displayDiv = DOM.elid(element || "display-wrapper");
    let section = DOM.section();
    section.appendChild(DOM.h2(title));
    section.appendChild(DOM.h5(description));
    results.map((result) => {
        let row = section.appendChild(DOM.div({ className: 'row' }));
        row.appendChild(DOM.div({ className: 'col-sm-4 field' }, result.label));
        row.appendChild(DOM.div({ className: 'col-sm-8 field-value' }, result.error ? String(result.error) : String(result.value)));
        section.appendChild(row);
    })
    displayDiv.append(section);
}
