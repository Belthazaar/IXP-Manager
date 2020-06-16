/**
 * 
 */

function mxSwitchConnectionHandler(graph)
{
    if (graph != null)
	{
		this.graph = graph;
    }
};

mxSwitchConnectionHandler.prototype.addConnection = function(source, target)
{
    src_ports = this.getAvailablePorts(source);
    target_ports = this.getAvailablePorts(target);
    match = this.findMatchingPorts(src_ports, target_ports);
    return match;
}


mxSwitchConnectionHandler.prototype.getSwitchName = function(sw)
{
    sw_name = sw.value.getAttribute(`switch`)
    return sw_name;
}

mxSwitchConnectionHandler.prototype.getAvailablePorts = function(sw)
{
    var interfaces = null;
    var available_ports = [];
    var sw_name  = this.getSwitchName(sw);
    if (sw.value.childNodes.length == 1)
    {
        interfaces = sw.value.firstChild;
    }
    if (interfaces != null)
    {
        for (iface of interfaces.childNodes){
            if (iface.hasAttribute(`Core`)){
                p = iface.getAttribute(`name`);
                sw_port = sw_name + ',' + p;
                available_ports.push(sw_port);
            }
        }
    }
    return available_ports;
}

mxSwitchConnectionHandler.prototype.findMatchingPorts = function(src, target)
{
    var match = "";
    for (src_iface of src){
        src_port = src_iface.slice(-2);
        for (tgt_iface of target){
            tgt_port = tgt_iface.slice(-2);
            if (src_port === tgt_port){
                match = src_iface + ',' + tgt_iface;
                return match;
            }
        }
    }
}