/** 
 * Constructs the Umbrella object for the given ui
 */
function Umbrella(editorUi) {
    this.editorUi = editorUi;
    this.umbrella = new Object();
    this.links = [];
    this.coreLinks = {};
    this.switches = [];
    this.link_nodes = [];
    this.hosts = [];
    this.vlans = {};
    this.faucetObject = {};
    this.addressToPort = {};
    this.spfGraphing = new spfGraph();
    this.groupID = 0;
    this.splitChar = ".";
    this.topology = new Object();
    this.init()
}

Umbrella.prototype.init = function () {
    var ui = this.editorUi;
    var editor = ui.editor;
    this.faucetObject.dps = {};
    this.faucetObject.vlans = {};
    this.faucetObject.acls = {};
    var graphXML = editor.getGraphXml();

    for (var node of graphXML.childNodes[0].childNodes) {
        var id = node.id;

        if (node.hasAttribute('link')) {
            // console.log(id + " is a link node");
            
            var linkSpeed = node.hasAttribute('speed') ? node.getAttribute('speed') : 10000;
            var link = {
                'link': node.getAttribute('link'),
                'speed': linkSpeed
            };
            this.links.push(link);
        } else if (node.hasAttribute('switch')) {
            // console.log(id + " is a switch node");
            this.processSwitch(node);
        } else {
            console.log(id + " is a rubbish");
        }
    }
    this.SPFOrganise();

    for (var edge of this.link_nodes) {
        this.spfGraphing.addEdge(edge[0], edge[1], edge[2]);
    }
    this.tidyCoreLinks();
    this.generateACLS();
    // console.log(this.faucetObject);
    var yamlObj = jsyaml.dump(this.faucetObject);

    this.cleanYaml(yamlObj)
    this.topogenerator()
};

Umbrella.prototype.processSwitch = function (switchNode) {
    var swname = switchNode.getAttribute('switch');
    this.switches.push(swname);
    // if (!switchNode.hasAttribute('dpid')) {
    //     console.log("WARN: Switch " + switchNode.getAttribute('name') +
    //         " is not a OF switch.\n" +
    //         "No faucet config will be generated for this switch");
    //     return
    // }
    if (!switchNode.hasAttribute('dpid')) {
        // console.log("WARN: Switch " + switchNode.getAttribute('name') +
        //     " is not a OF switch.\n" +
        //     "No faucet config will be generated for this switch");

        switchNode.setAttribute("dpid", switchNode.getAttribute('swid'))
    }

    this.faucetObject.dps[swname] = {};
    this.faucetObject.dps[swname].dp_id = parseInt(switchNode.getAttribute('dpid'), 10);
    this.faucetObject.dps[swname].hardware = switchNode.getAttribute('hardware');
    this.faucetObject.dps[swname]['interfaces'] = {};
    this.addressToPort[swname] = {};

    for (var child of switchNode.children) {
        if (child.localName == "interfaces") {
            for (var iface of child.childNodes) {
                if (iface.nodeName == "iface") {
                    var linkname = iface.getAttribute("name") +
                        ",port1.0.1," + swname +
                        ",port " + iface.getAttribute('port');

                    var link = {
                        'link': linkname,
                        'speed': iface.getAttribute('speed')
                    };

                    this.links.push(link);
                    var port = Number(iface.getAttribute('port'))
                    this.faucetObject.dps[swname]['interfaces'][port] = {
                        'name': iface.getAttribute('name'),
                        'native_vlan': parseInt(iface.getAttribute('vlan'), 10),
                        'acl_in': parseInt(switchNode.getAttribute('dpid'), 10)
                    }
                    if (!this.faucetObject.vlans.hasOwnProperty(iface.getAttribute('vlan_name'))) {
                        this.faucetObject.vlans[iface.getAttribute('vlan_name')] = {
                            'vid': parseInt(iface.getAttribute('vlan'), 10),
                            'description': iface.getAttribute('vlan_description'),
                        }
                    }
                    var ipv4 = iface.getAttribute('ipv4_address');
                    this.addressToPort[swname][ipv4] = {
                        'port': parseInt(iface.getAttribute('port')),
                        'addr_type': 'ipv4',
                        'name': iface.getAttribute('name')
                    }

                    var ipv6 = iface.getAttribute('ipv6_address');
                    if (ipv6 != 'undefined') {
                        this.addressToPort[swname][ipv6] = {
                            'port': parseInt(iface.getAttribute('port')),
                            'addr_type': 'ipv6',
                            'name': iface.getAttribute('name')
                        }
                    }

                    var mac = iface.getAttribute('macaddress');
                    this.addressToPort[swname][mac] = {
                        'port': parseInt(iface.getAttribute('port')),
                        'addr_type': 'mac',
                        'name': iface.getAttribute('name')
                    }

                }
            }
        }
    }
};


Umbrella.prototype.SPFOrganise = function () {
    for (var link of this.links) {
        var cost = 100000 / (parseInt(link['speed']));
        var nodes = link['link'].split(',');
        this.link_nodes.push([nodes[0], nodes[2], cost])
    }
};

Umbrella.prototype.generateACLS = function () {
    for (var sw of Object.entries(this.addressToPort)) {
        var swName = sw[0];
        var aclNum = this.faucetObject.dps[swName]['dp_id'];
        this.faucetObject.acls[aclNum] = [];
        this.groupID = Math.ceil(this.groupID / 1000) * 1000;
        for ([addr, details] of Object.entries(sw[1])) {
            switch (details.addr_type) {
                case "ipv4":
                    this.ownIPv4ACL(addr, details.port, aclNum);
                    break;
                case "ipv6":
                    this.ownIPv6ACL(addr, details.port, aclNum);
                    break;
                case "mac":
                    this.ownMacACL(addr, details.port, aclNum);
                    this.portToMacACL(addr, details.port, aclNum);
                    break;
            }
        }
        for (var otherSW of Object.entries(this.addressToPort)) {
            var otherSWName = otherSW[0]
            if (swName == otherSWName) {
                continue;
            }
            for ([addr, details] of Object.entries(otherSW[1])) {
                var route = this.djikistra(this.spfGraphing, swName, details.name);

                if (route.length <= 3) {
                    var ports = [];
                    var otherPorts = [];
                    for (var [port, entry] of Object.entries(this.coreLinks[swName])) {
                        p = parseInt(port, 10);
                        if (entry.hasOwnProperty(otherSWName)) {
                            ports.push(p);
                        } else {
                            otherPorts.push(p);
                        }
                    }
                    ports = ports.concat(otherPorts);

                    switch (details.addr_type) {
                        case "ipv4":
                            this.otherIPv4ACL(addr, ports, aclNum);
                            break;
                        case "ipv6":
                            this.otherIPv6ACL(addr, ports, aclNum);
                            break;
                        case "mac":
                            this.otherMacACL(addr, ports, aclNum);
                            break;
                    }
                } else {
                    this.umbrellaACL(addr, details.addr_type, aclNum,
                        route, swName)
                }
            }
        }
    }
};


Umbrella.prototype.umbrellaACL = function (addr, addr_type, aclNum, route, sw) {

    var outPort = 0;
    var ports = [];
    var prevHop = "";


    for (var hop of route) {
        if (hop == sw) {
            prevHop = hop;
            continue;
        }
        if (hop == route[-1]) {
            var lastPort = this.addressToPort[prevHop][addr].port;
            ports.push(lastPort);
            continue;
        }
        if (prevHop) {
            for ([port, details] of Object.entries(this.coreLinks[prevHop])) {
                if (details.hasOwnProperty(hop)) {
                    if (prevHop == sw) {
                        outPort = port;
                    } else {
                        ports.push(port)
                    }
                }
            }
        }
        prevHop = hop;
    }

    for (var i = ports.length; i < 6; i++){
        ports.push(0)
    }

    var mac = "";
    count = 1;
    for (var port of ports) {
        var portStr = port.toString(16);
        if (portStr.length == 1) {
            portStr = "0" + portStr;
        }
        mac += portStr;
        if (count < ports.length) {
            mac += ":"
            count++;
        }
    }
    outPort = parseInt(outPort, 10);
    switch (addr_type) {
        case "ipv4":
            this.umbrellaIPv4ACL(addr, outPort, aclNum, mac);
            break;
        case "ipv6":
            this.umbrellaIPv6ACL(addr, outPort, aclNum, mac);
            break;
        case "mac":
            this.umbrellaMacACL(addr, outPort, aclNum, mac);
            break;
    }
}


Umbrella.prototype.tidyCoreLinks = function () {
    // TODO: Organise core links
    for (var sw of this.switches) {
        this.coreLinks[sw] = {};
    }
    var vlan = Object.entries(this.faucetObject.vlans)

    var vid = vlan[0][1].vid;
    for (var link of this.links) {
        var linkNodes = link['link'].split(',');
        if (this.switches.includes(linkNodes[0]) &&
            this.switches.includes(linkNodes[2])) {

            var sw1 = linkNodes[0];
            var sw1Port = linkNodes[1].split(this.splitChar)[2];
            var sw2 = linkNodes[2];
            var sw2Port = linkNodes[3].split(this.splitChar)[2];

            this.coreLinks[sw1][sw1Port] = this.coreLinks[sw1][sw1Port] || {};
            this.coreLinks[sw1][sw1Port][sw2] = sw2Port;
            this.coreLinks[sw2][sw2Port] = this.coreLinks[sw2][sw2Port] || {};
            this.coreLinks[sw2][sw2Port][sw1] = sw1Port;

            if (this.faucetObject.dps.hasOwnProperty(sw1)){
                
                this.faucetObject.dps[sw1]['interfaces'][sw1Port] = {
                'name': link['link'],
                'opstatus_reconf': false,
                'acl_in': this.faucetObject.dps[sw1].dp_id,
                'native_vlan': vid
                }
            }
            
            if (this.faucetObject.dps.hasOwnProperty(sw2)){
            
                this.faucetObject.dps[sw2]['interfaces'][sw2Port] = {
                    'name': link['link'],
                    'opstatus_reconf': false,
                    'acl_in': this.faucetObject.dps[sw2].dp_id,
                    'native_vlan': vid
                }
            }
        }
    }
};


Umbrella.prototype.djikistra = function (graph, initial, end) {

    var shortestPaths = {};
    shortestPaths[initial] = [false, 0];
    var current_node = initial;
    var visited = new Set();

    while (current_node != end) {
        visited.add(current_node)
        var destinations = graph.edges[current_node];
        var weightToCurrentNode = shortestPaths[current_node][1]

        for (var nextNode of destinations) {
            var weight = graph.weights[current_node][nextNode] + weightToCurrentNode;
            if (!shortestPaths.hasOwnProperty(nextNode)) {
                shortestPaths[nextNode] = [current_node, weight];
            } else {
                var currentShortestWeight = shortestPaths[nextNode][1]
                if (currentShortestWeight > weight) {
                    shortestPaths[nextNode] = [current_node, weight];
                }
            }
        }

        var nextDestinations = [];
        for (var obj of Object.entries(shortestPaths)) {
            if (!visited.has(obj[0])) {
                o = {};
                o[obj[0]] = obj[1];
                nextDestinations.push(o);
            }
        }
        if (nextDestinations.length < 1) {
            return ("Route Not Possible");
        }
        current_node = nextDestinations.reduce(
            (acc, loc) =>
            acc[1] < loc[1] ? acc : loc);
        current_node = Object.keys(current_node)[0]
    }

    var path = [];
    while (current_node) {
        path.push(current_node);
        nextNode = shortestPaths[current_node][0];
        current_node = nextNode;
    }
    path.reverse();
    return (path);
};


Umbrella.prototype.ownIPv4ACL = function (addr, port, acl_num) {

    this.faucetObject.acls[acl_num].push({
        "rule": {
            "dl_type": "0x806",
            "dl_dst": "ff:ff:ff:ff:ff:ff",
            "arp_tpa": String(addr),
            "actions": {
                "output": {
                    "port": port
                }
            }
        }
    });
};

Umbrella.prototype.ownIPv6ACL = function (addr, port, acl_num) {

    this.faucetObject.acls[acl_num].push({
        "rule": {
            "dl_type": "0x86DD",
            "ip_proto": 58,
            "icmpv6_type": 135,
            "ipv6_nd_target": String(addr),
            "actions": {
                "output": {
                    "port": port
                }
            }
        }
    });
};

Umbrella.prototype.ownMacACL = function (addr, port, acl_num) {

    this.faucetObject.acls[acl_num].push({
        "rule": {
            "dl_dst": String(addr),
            "actions": {
                "output": {
                    "port": port
                }
            }
        }
    });
};

Umbrella.prototype.otherIPv4ACL = function (addr, ports, acl_num) {

    this.groupID += 1;
    this.faucetObject.acls[acl_num].push({
        "rule": {
            "dl_type": "0x806",
            "dl_dst": "ff:ff:ff:ff:ff:ff",
            "arp_tpa": String(addr),
            "actions": {
                "output": {
                    "failover": {
                        "group_id": this.groupID,
                        "ports": ports
                    }
                }
            }
        }
    });
};

Umbrella.prototype.otherIPv6ACL = function (addr, ports, acl_num) {

    this.groupID += 1;
    this.faucetObject.acls[acl_num].push({
        "rule": {
            "dl_type": "0x86DD",
            "ip_proto": 58,
            "icmpv6_type": 135,
            "ipv6_nd_target": String(addr),
            "actions": {
                "output": {
                    "failover": {
                        "group_id": this.groupID,
                        "ports": ports
                    }
                }
            }
        }
    });
};


Umbrella.prototype.otherMacACL = function (addr, ports, acl_num) {

    this.groupID += 1;
    this.faucetObject.acls[acl_num].push({
        "rule": {
            "dl_dst": String(addr),
            "actions": {
                "output": {
                    "failover": {
                        "group_id": this.groupID,
                        "ports": ports
                    }
                }
            }
        }
    });
};

Umbrella.prototype.umbrellaIPv4ACL = function (addr, outPort, acl_num, mac) {

    this.faucetObject.acls[acl_num].push({
        "rule": {
            "dl_type": "0x806",
            "dl_dst": "ff:ff:ff:ff:ff:ff",
            "arp_tpa": String(addr),
            "actions": {
                "output": {
                    "set_fields": [{
                        "eth_dst": mac
                    }],
                    "port": outPort
                }
            }
        }
    });
};

Umbrella.prototype.umbrellaIPv6ACL = function (addr, outPort, acl_num, mac) {

    this.faucetObject.acls[acl_num].push({
        "rule": {
            "dl_type": "0x86DD",
            "ip_proto": 58,
            "icmpv6_type": 135,
            "ipv6_nd_target": String(addr),
            "actions": {
                "output": {
                    "set_fields": [{
                        "eth_dst": mac
                    }],
                    "port": outPort
                }
            }
        }
    });
};

Umbrella.prototype.umbrellaMacACL = function (addr, outPort, acl_num, mac) {

    this.faucetObject.acls[acl_num].push({
        "rule": {
            "dl_dst": String(addr),
            "actions": {
                "output": {
                    "set_fields": [{
                        "eth_dst": mac
                    }],
                    "port": outPort
                }
            }
        }
    });
};

Umbrella.prototype.portToMacACL = function (addr, port, acl_num) {

    portStr = port.toString(16);
    if (portStr.length == 1) {
        portStr = "0" + portStr;
    }
    mac = portStr + ":00:00:00:00:00";
    this.faucetObject.acls[acl_num].push({
        "rule": {
            "dl_dst": mac,
            "actions": {
                "output": {
                    "set_fields": [{
                        "eth_dst": String(addr)
                    }],
                    "port": port
                }
            }
        }
    });
};



Umbrella.prototype.cleanYaml = async function(yamlObj){
    var ports = new Set();
    for(var[swname, sw] of Object.entries(this.faucetObject.dps)){;
        for(var [port, details] of Object.entries(sw.interfaces)){
            ports.add(parseInt(port), 10);
        }
    }
    for(var acl of Object.keys(this.faucetObject.acls)){
        ports.add(parseInt(acl), 10);
    }
    
    var cleanYaml = await this.removeQuotesFromKeys(ports, yamlObj).then(
        result => {
            return result;
        }
    )
    // console.log(cleanYaml);
    this.saveYaml(cleanYaml);
}

Umbrella.prototype.removeQuotesFromKeys = function(ports, yamlDirty){
    return new Promise((resolve, reject) => {
        var result = yamlDirty;
        for(var id of ports){
            var reg = new RegExp("\'" + id + "\'" , "g");
            result = result.replace(reg, id.toString())
        }
        resolve(result);
    });
}

Umbrella.prototype.topogenerator = function(){
    var host_matrix = new Object();
    var ipv4 = "127.0.0.1/8"
    var ipv6 = "::1'/128"
    var mac = "00:00:00:00:00:01"
    this.topology.hosts_matrix = []
    this.topology.switch_matrix = {}
    this.topology.switch_matrix.dp_ids = {}
    this.topology.switch_matrix.links = []
    // console.log("topo faucet obj")
    // console.log(this.faucetObject)
    for (sw of Object.entries(this.addressToPort)) {
        host_matrix = {};
        if (!sw) {
            continue
        }
        var seen_ports = []
        sw_name = sw[0]
        // console.log("sw_name");
        // console.log(sw_name);
        // console.log(sw);
        for ([addr, details] of Object.entries(sw[1])){
            var raw_port = this.faucetObject.dps[sw_name]['interfaces'][details.port]["name"];
            var clean_port = raw_port.replace(/[\W_]+/g,"");
            var short_p = clean_port.substring(0,8);
            if (!seen_ports.includes(short_p)){
                host_matrix[short_p] = {};
                host_matrix[short_p].ipv4 = null;
                host_matrix[short_p].ipv6 = null;
                host_matrix[short_p].mac = null;
                host_matrix[short_p].portnum = details.port;
                seen_ports.push(short_p)
            }
            switch (details.addr_type) {
                case "ipv4":
                    host_matrix[short_p].ipv4 = addr + "/8";
                    break;
                case "ipv6":
                    host_matrix[short_p].ipv6 = addr + "/48";
                    break;
                case "mac":
                    host_matrix[short_p].mac = addr;
                    break;
            
            }
        }
        clean_sw = sw_name.replace(/[\W_]+/g,"");
        trunc_sw = clean_sw.substring(0,8);
        // console.log(host_matrix);
        for (var p of seen_ports) {
            this.topology.hosts_matrix.push([p, host_matrix[p].ipv4, host_matrix[p].ipv6, 
                host_matrix[p].mac, trunc_sw, host_matrix[p].portnum])
        }
        this.topology.switch_matrix.dp_ids[trunc_sw] = this.faucetObject.dps[sw_name].dp_id;
    }
    for (var link of this.links) {
        var linkNodes = link['link'].split(',');
        if (this.switches.includes(linkNodes[0]) &&
            this.switches.includes(linkNodes[2])) {

            var sw1 = linkNodes[0];
            var sw1Port = linkNodes[1].split(this.splitChar)[2];
            var sw2 = linkNodes[2];
            var sw2Port = linkNodes[3].split(this.splitChar)[2];
            this.topology.switch_matrix.links.push([sw1, sw1Port, sw2, sw2Port])
        }
    }
    // console.log(this.topology);
    this.saveTopo(this.topology);
}

Umbrella.prototype.saveYaml = function(yamlObj){
    let phpurl = window.location.origin + "/faucet/saveFaucet";
    var d = String(yamlObj)
    $.ajax({
        url: phpurl,
        type: "POST",
        data: {"msg": d},
    }).done(function(msg){
        console.log("save faucet success")
        console.log(msg)
        alert("faucet config generated successfully. Saved to the push-on-green module")
    })
    .fail(function(){
        console.log("something went wrong in saving faucet")
    })
};

Umbrella.prototype.saveTopo = function(topo){
    let phpurl = window.location.origin + "/faucet/saveTopo";
    d = JSON.stringify(topo);
    dstring = String(d);
    $.ajax({
        url: phpurl,
        type: "POST",
        data: {"msg": dstring}
    }).done(function(msg){
        console.log("save topo success")
        console.log(msg)
    })
    .fail(function(){
        console.log("something went wrong in saving topo")
    })
};


class spfGraph {
    constructor() {
        this.edges = {};
        this.weights = {};
        this.detectedEdges = new Set();
    }

    addEdge(fromNode, toNode, weight) {
        this.edges[fromNode] = this.edges[fromNode] || [];
        this.edges[toNode] = this.edges[toNode] || [];
        this.edges[fromNode].push(toNode);
        this.edges[toNode].push(fromNode);
        if (!this.detectedEdges.has(fromNode)) {
            this.weights[fromNode] = {};
            this.detectedEdges.add(fromNode);
        };
        if (!this.detectedEdges.has(toNode)) {
            this.weights[toNode] = {};
            this.detectedEdges.add(toNode);
        }
        this.weights[fromNode][toNode] = weight;
        this.weights[toNode][fromNode] = weight;
    }
}