/**
 * Starts the API calls for connecting to the IXP-Manager
 */
function docker(ui) {
    // alert("hello");
    // new Umbrella(ui);
    this.getLogs();
};

docker.prototype.getLogs = function () {
    let url = window.location.origin + "/faucet/getLatestLogs";
    console.log(url);
    var result = null;
    $.ajax(url)
        .done(function (data) {
            result = data;
            testReq(data);
            // var a = document.createElement("a");
            // var file = new Blob([data], {type: 'text/plain'});
            // a.href = URL.createObjectURL(file);
            // a.download = 'logs.txt';
            // a.click();
            
        })
        .fail(function (){
            alert("Something went wrong");
        })
}

function testReq(d) {
    let phpurl = window.location.origin + "/faucet/testReq";
    // console.log(phpurl);
    // console.log("hello testreq");
    // console.log(d);
    // $.ajaxSetup({
    //     headers: {
    //         'X-CSRF-TOKEN': $('meta[name="csrf-token"]').attr('content')
    //     }
    // });
    $.ajax({
        url: phpurl,
        type: "PUT",
        data: d,
    }).done(function(msg){
        console.log(msg)
            var a = document.createElement("a");
            var file = new Blob([msg], {type: 'text/plain'});
            a.href = URL.createObjectURL(file);
            a.download = 'logs.txt';
            a.click();
    })
    .fail(function(){
        alert("something went wrong")
    })
}


docker.prototype.testReq = function(d) {
    let phpurl = window.location.origin + "/faucet/testReq";
    console.log(phpurl);
    console.log("hello worng testreq");
    $.ajax({
        url: phpurl,
        type: "POST",
        data: {json: d}
    }).done(function(msg){
        console.log(msg)
            var a = document.createElement("a");
            var file = new Blob([msg], {type: 'text/plain'});
            a.href = URL.createObjectURL(file);
            a.download = 'logs.txt';
            a.click();
    })
    .fail(function(){
        alert("something went wrong")
    })
}