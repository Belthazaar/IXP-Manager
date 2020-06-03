function display() {
    let url = encodeURI("faucet/generateConfig");
    console.log(url);

    $.ajax(url)
        .done(function (data) {
            // var a = document.createElement("a");
            // var file = new Blob([data], {type: 'text/plain'});
            // a.href = URL.createObjectURL(file);
            // a.download = 'faucet.txt';
            // a.click();
            alert(data);
            appendLinks();
            
        })
        .fail(function (){
            alert("Something went wrong");
        })
}

function appendLinks(){
    var a = document.getElementById("toAdd");
    var funcs = ["getYaml()", "getTopology()", "getLogs()"]
    var textList = ["Download faucet.yaml", "Download topology.json", 
                    "Download latest log"]
    
    index = 0;

    for (var f of funcs) {
        var r = document.createElement("div");
        r.setAttribute("class", "row tw-mb-6");
        var btn = document.createElement("a");
        btn.setAttribute("class", "btn btn-white ml-2");
        btn.setAttribute("onclick", f);
        btn.text =textList[index];
        r.appendChild(btn);
        a.appendChild(r);
        index++;
    };
    

}

function getYaml() {
    let url = encodeURI("faucet/getFaucetYaml");
    console.log(url);

    $.ajax(url)
        .done(function (data) {
            var a = document.createElement("a");
            var file = new Blob([data], {type: 'text/plain'});
            a.href = URL.createObjectURL(file);
            a.download = 'faucet.yaml';
            a.click();
            
        })
        .fail(function (){
            alert("Something went wrong");
        })
}

function getTopology() {
    let url = encodeURI("faucet/getTopologyJson");
    console.log(url);

    $.ajax(url)
        .done(function (data) {
            var a = document.createElement("a");
            var file = new Blob([data], {type: 'text/plain'});
            a.href = URL.createObjectURL(file);
            a.download = 'topology.json';
            a.click();
        })
        .fail(function (){
            alert("Something went wrong");
        })
}

function getLogs() {
    let url = encodeURI("faucet/getLatestLogs");
    console.log(url);

    $.ajax(url)
        .done(function (data) {
            var a = document.createElement("a");
            var file = new Blob([data], {type: 'text/plain'});
            a.href = URL.createObjectURL(file);
            a.download = 'logs.txt';
            a.click();
            
        })
        .fail(function (){
            alert("Something went wrong");
        })
}

function openMxGraph() {
    let url= window.location.origin + "/mxgraph";
    window.open(url, "_self");
}