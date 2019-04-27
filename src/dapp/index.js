
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
        });


        // User-submitted transaction
        DOM.elid('submit-oracle').addEventListener('click', () => {
            let flight = DOM.elid('flight-number').value;
            // Write transaction
            contract.fetchFlightStatus(flight, (error, result) => {
                display('Oracles', 'Trigger oracles', [{ label: 'Fetch Flight Status', error: error, value: result.flight + ' ' + result.timestamp }]);
            });
        })
        
        fillAirlines(contract.getAirlines())

        contract.fetchFlightsFromServer(fillFlightsOptions);
        
        DOM.elid('submit-fund').addEventListener('click', () => {
            let airline = DOM.elid('airline-fund-list-1').value;
            let amount = DOM.elid('airline-fund-value').value;
            // Write transaction
            contract.submitAirlineFund(airline, amount, (error, result) => {
                display('Airlines', 'Call Fund Airline', [{ label: 'Fund Airline', error: error, value: 'Airline funded successfully.' }], 'display-wrapper-1');
            });
        })

        DOM.elid('buy-insurance').addEventListener('click', () => {
            let airline = DOM.elid('airline-fund-list-2').value;
            let flight = DOM.elid('flight-number').value;
            let flightTimestamp = DOM.elid('flight-date').value;
            let amount = DOM.elid('insurance-value').value;
            // Write transaction
            contract.buyInsurance(airline, amount, (error, result) => {
                display('Airlines', 'Call Fund Airline', [{ label: 'Fund Airline', error: error, value: 'Airline funded successfully.' }], 'display-wrapper-1');
            });
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
        let option = DOM.createOption(a.name, a.id);
        flightsSelect1.appendChild(option); 
    });

}
function fillAirlines(airlines) {
    let airlinesSelect1 = DOM.elid('airline-fund-list-1');
    var length = airlinesSelect1.options.length;
    for (var i = 0; i < length; i++) {
        airlinesSelect1.options[i] = null;
    }

    let airlinesSelect2 = DOM.elid('airline-fund-list-2');
    var length = airlinesSelect2.options.length;
    for (i = 0; i < length; i++) {
        airlinesSelect2.options[i] = null;
    }

    airlines.forEach(a=>{
        let option = DOM.createOption(a.name, a.id);
        airlinesSelect1.appendChild(option); 
    });
    
    airlines.forEach(a=>{
        let option = DOM.createOption(a.name, a.id);
        airlinesSelect2.appendChild(option); 
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
