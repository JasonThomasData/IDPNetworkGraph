function getApplicationRole(ApplicationRoles) {
    var roleSelectedElement = document.getElementById('role');
    var roleSelected = roleSelectedElement.options[roleSelectedElement.selectedIndex].value; 
    return ApplicationRoles[roleSelected]
}

function getNeighbourIdsDependingOnRole(node, links, role, ApplicationRoles) {
    return links.reduce(function (neighbors, link) {
        if (role == ApplicationRoles.RESOURCE && link.target.id === node.id) {
            neighbors.push(link.source.id)
        } else if (role == ApplicationRoles.CLIENT && link.source.id === node.id) {
            neighbors.push(link.target.id)
        }
        return neighbors
        },
        [node.id]
    )
}

function isNeighbourNode(node, neighbourIds) {
    return Array.isArray(neighbourIds) && neighbourIds.indexOf(node.id) > -1
}

function getNodeColor(node, neighbourIds, Colours) {
    return isNeighbourNode(node, neighbourIds) ? Colours.HIGHLIGHTED : Colours.BASE 
}

function isLinkFromSource(node, link) {
    return link.source.id === node.id
}

function isLinkToTarget(node, link) {
    return link.target.id === node.id
}

function getLinkColor(node, link, role, ApplicationRoles, Colours) {
    if (role == ApplicationRoles.CLIENT) {
        return isLinkFromSource(node, link) ? Colours.HIGHLIGHTED : Colours.BASE
    }
    return isLinkToTarget(node, link) ? Colours.HIGHLIGHTED : Colours.BASE
}

function getMarkerEnd(node, link, role, ApplicationRoles) {
    if (role == ApplicationRoles.CLIENT) {
        return isLinkFromSource(node, link) ? 'url(#highlighted)' : 'url(#base)'
    }
    return isLinkToTarget(node, link) ? 'url(#highlighted)' : 'url(#base)'
}

function getLinkVisibility(link, authFlowsIncluded) {
    return authFlowsIncluded["code-flow"] && link.code_flow > 0 ||
        authFlowsIncluded["implicit-flow"] && link.implicit_flow > 0 ||
        authFlowsIncluded["password-flow"] && link.password_flow > 0 ||
        authFlowsIncluded["client-credentials-flow"] && link.client_credentials_flow > 0 ||
        authFlowsIncluded["token-exchange-flow"] && link.token_exchange_flow > 0
}

function updateHighlights(selectedNode, links, applicationRole, ApplicationRoles, nodeElements, pathElements, Colours) {
    var neighbourIds = getNeighbourIdsDependingOnRole(selectedNode, links, applicationRole, ApplicationRoles)

    nodeElements.attr('fill', function (node) { return getNodeColor(node, neighbourIds, Colours) })
    pathElements.attr('stroke', function (link) { console.log(link); return getLinkColor(selectedNode, link, applicationRole, ApplicationRoles, Colours) })
    pathElements.attr('marker-end', function (link) { return getMarkerEnd(selectedNode, link, applicationRole, ApplicationRoles) })

}

function updateVisibility(nodes, links, authFlowsIncluded, pathElements, nodeElements, force) {
    /*
    force
        .nodes(d3.values(function () {
            var suitableNodes = {}
            for (const key in nodes) {
                if (key == "adept-mining-machine") {
                    suitableNodes.append(nodes[key])
                }
            }
            return suitableNodes
        }))
        .start()
    */
   /*
    pathElements.style('visibility', function (link) { return getLinkVisibility(link, authFlowsIncluded) })
    links.forEach(function(link) {
        console.log(link)
    })
    nodeElements.style('visibility', function (node) { return "visible" })
    */
}


function updateInformation(selectedNode, links, role, ApplicationRoles, nodeElements, pathElements, Colours) {
    var neighbourIds = getNeighbourIdsDependingOnRole(selectedNode, links, role, ApplicationRoles)

    //nodeElements.attr('fill', function (node) { return getNodeColor(node, neighbourIds, Colours) })
    //pathElements.attr('stroke', function (link) { return getLinkColor(selectedNode, link, role, ApplicationRoles, Colours) })
    //pathElements.attr('marker-end', function (link) { return getMarkerEnd(selectedNode, link, role, ApplicationRoles) })
}

function sortNodesByApplicationName(nodes) {
    var nodeKeys = Object.keys(nodes).sort()
    var applicationNames = []
    var nodesSortedByApplicationName = []
    nodeKeys.forEach(function(key) {
        applicationNames.push(nodes[key].name)
    })
    applicationNames.sort().forEach(function(name) {
        for(var key in nodes) {
            if (nodes[key].name == name) {
                nodesSortedByApplicationName.push(nodes[key])
            }
        }
    })
    return nodesSortedByApplicationName
}

function getLinksForDisplay(links, authFlowsIncluded) {
    var linksForDisplay = []
    links.forEach(function(link) {
        if(getLinkVisibility(link, authFlowsIncluded))
        linksForDisplay.push(link)
    })
    return linksForDisplay
}

function getNodesForDisplay(linksForDisplay) {
    var nodes = {};
    //In this graph, source == client_id and target == resource_id
    linksForDisplay.forEach(function(link) {
        if(link.source.id != undefined) {
            link.source = link.source.id
        }
        if(link.target.id != undefined) {
            link.target = link.target.id
        }
        link.source = nodes[link.source] ||
            (nodes[link.source] = {
                id: link.client_id,
                name: link.client_name
            });
        link.target = nodes[link.target] ||
            (nodes[link.target] = {
                id: link.resource_id,
                name: link.resource_name
            });
    });
    return nodes;
}

d3.csv("output.csv", function(linksLoaded) {

    const Colours = {
        BASE: '#c5dafc',
        HIGHLIGHTED: '#2B74DF'
    }

    const ApplicationRoles = {
        CLIENT: 0,
        RESOURCE: 1
    }

    var dataVizState = {
        selectedNode: null,
        applicationRole: getApplicationRole(ApplicationRoles),
        authFlowsIncluded: {
            "code-flow": true,
            "implicit-flow": true,
            "password-flow": true,
            "client-credentials-flow": true,
            "token-exchange-flow": true 
        }
    }

    var linksForDisplay = getLinksForDisplay(linksLoaded, dataVizState.authFlowsIncluded); 
    var nodesForDisplay = getNodesForDisplay(linksForDisplay);
    //In this graph, source == client_id and target == resource_id
    
    var width = d3.select('#dataviz').node().getBoundingClientRect().width
    var height = d3.select('#dataviz').node().getBoundingClientRect().height

    //Centre the graph in the middle of the page
    //Make the centre vertex, or root node, unmoving, or hard to move
    var force = d3.layout.force()
        .nodes(d3.values(nodesForDisplay))
        .links(linksForDisplay)
        .size([width, height])
        .linkDistance(15)
        .charge(function(d, i) { return d.weight * -100 - 100; })
        .on("tick", tick)
        .start()

    /*
    setTimeout(function() {
        var nodesToRemove = []
        nodesToRemove.push(force.nodes()[0])
        nodesToRemove.push(force.nodes()[5])
        nodesToRemove.push(force.nodes()[10])
        nodesToRemove.push(force.nodes()[15])
        nodesToRemove.push(force.nodes()[20])
        nodesToRemove.push(force.nodes()[25])
        force.nodes().splice(0, 1);
        force.nodes().splice(5, 1);
        force.nodes().splice(10, 1);
        force.nodes().splice(15, 1);
        force.nodes().splice(20, 1);
        force.nodes().splice(25, 1);
        nodesToRemove.forEach(function(node) {
            var links = force.links()
            var links = force.links().filter(function(l) {
                return l.source !== node && l.target !== node;
            });
            force.links(links)
        })
    }, 2000)

    setTimeout(function() {
        force
        .nodes(d3.values(nodes))
        .links(links)
        .size([width, height])
        .linkDistance(15)
        .charge(function(d, i) { return d.weight * -100 - 100; })
        .on("tick", tick)
        .start()
    }, 3000)
    */

    function dragged() {
        console.log(d3.select("g"))
        console.log("Hello")
        //d3.select(g).attr("cx", d.x = d3.event.x).attr("cy", d.y = d3.event.y);
    }

    function zoomed() {
        d3.select("svg").attr("transform", "translate(" + d3.event.translate + ")" + "scale(" + d3.event.scale + ")")
        //d3.select(g).attr("cx", d.x = d3.event.x).attr("cy", d.y = d3.event.y);
    }

    var zoomBehaviour = d3.behavior.zoom()
        //.on("start", dragstarted)
        .on("zoom", zoomed)
        //.on("end", dragended)

    var dragBehaviour = d3.behavior.drag()
        //.on("start", dragstarted)
        .on("drag", dragged)
        //.on("end", dragended)

    var svg = d3.select("#dataviz").append("svg")
        .attr("width", width)
        .attr("height", height)
        //.attr("cursor", "grab")
        .attr("viewBox", "0 0 " + width*1.2 + " " + height*1.2 )
        //.call(zoomBehaviour);

    var g = svg.append("g")
        .attr("align","center")
        //.call(dragBehaviour);

    /*
    function dragstarted() {
        d3.select(g).raise();
        svg.attr("cursor", "grabbing");
    }


    function dragended() {
        svg.attr("cursor", "grab");
    }
    */

    var pathElements = g.append("svg:g").selectAll("path")
        .data(force.links())
        .enter().append("svg:path")
        .attr("class", "link")
        .attr("marker-end", "url(#base)")
        .attr("stroke", Colours.BASE);

    g.append("svg:defs").selectAll("marker")
        .data(["highlighted"])
        .enter().append("svg:marker")
        .attr("id", String)
        .attr("viewBox", "0 -5 10 10")
        .attr("refX", 15)
        .attr("refY", -1.5)
        .attr("markerWidth", 8)
        .attr("markerHeight", 8)
        .attr("orient", "auto")
        .append("svg:path")
        .attr("d", "M0,-5L10,0L0,5")
        .attr("fill", Colours.HIGHLIGHTED);

    g.append("svg:defs").selectAll("marker")
        .data(["base"])
        .enter().append("svg:marker")
        .attr("id", String)
        .attr("viewBox", "0 -5 10 10")
        .attr("refX", 15)
        .attr("refY", -1.5)
        .attr("markerWidth", 8)
        .attr("markerHeight", 8)
        .attr("orient", "auto")
        .append("svg:path")
        .attr("d", "M0,-5L10,0L0,5")
        .attr("fill", Colours.BASE);

    var nodeElements = g.append("g")
        .attr("class", "nodes")
        .selectAll("circle")
        .data(force.nodes())
        .enter().append("circle")
            .attr("r", 5)
            .attr("cursor", "default")
            .attr("fill", Colours.BASE)
            .call(force.drag)
            .on('click', function(node) {
                dataVizState.selectedNode = node
                document.getElementById('application').value = node.id;
                updateHighlights(node, linksForDisplay, dataVizState.applicationRole, ApplicationRoles, nodeElements, pathElements, Colours)
            })

    d3.select("#role")
        .on('change', function() {
            dataVizState.applicationRole = getApplicationRole(ApplicationRoles) 
            updateHighlights(dataVizState.selectedNode, linksForDisplay, dataVizState.applicationRole, ApplicationRoles, nodeElements, pathElements, Colours)
        })

    var nodesSortedByApplicationName = sortNodesByApplicationName(nodesForDisplay) 
    var applicationSelectElement = d3.select("#application")
        .on('change', function() {
            var applicationId = this.options[this.selectedIndex].value
            dataVizState.selectedNode = nodesForDisplay[applicationId] 
            //updateInformation(dataVizState.selectedNode, links, dataVizState, ApplicationRoles, nodeElements, pathElements, Colours)
            updateHighlights(dataVizState.selectedNode, linksForDisplay, dataVizState.applicationRole, ApplicationRoles, nodeElements, pathElements, Colours)
        })
    nodesSortedByApplicationName.forEach(function(node) {
        applicationSelectElement.append("option")
            .attr("value", node.id)
            .text(node.name)
    })
    
    d3.selectAll(".auth-flow-toggle")
        .on("change", function() {
            //console.log(this)
            const checkBoxId = d3.select(this).property("id")
            //console.log("id", checkBoxId)
            const checkBoxChecked = d3.select(this).property("checked")
            //console.log("id", checkBoxChecked)
            dataVizState.authFlowsIncluded[checkBoxId] = checkBoxChecked

            //console.log("Links", linksForDisplay)
            linksForDisplay = getLinksForDisplay(linksLoaded, dataVizState.authFlowsIncluded); 
            //console.log("Links", linksForDisplay)

            console.log("Nodes", nodesForDisplay)
            nodesForDisplay = getNodesForDisplay(linksForDisplay);
            console.log("Nodes", nodesForDisplay)

            force.nodes(d3.values(nodesForDisplay))
                .links(linksForDisplay)
                .size([width, height])
                .linkDistance(15)
                .charge(function(d, i) { return d.weight * -100 - 100; })
                .start()

                /*
            d3.selectAll("path")
                    .data(force.links())
                    .enter().append("svg:path")
                    .attr("class", "link")
                    .attr("marker-end", "url(#base)")
                    .attr("stroke", Colours.BASE);
            */

            //console.log("Nodes", nodesForDisplay)
            //updateVisibility(nodesForDisplay, linksForDisplay, dataVizState.authFlowsIncluded, pathElements, nodeElements, force)
            /*
            force.nodes(d3.values(nodesForDisplay))
                .links(linksForDisplay)
                .size([width, height])
                .linkDistance(15)
                .charge(function(d, i) { return d.weight * -100 - 100; })
                .start()
            */
        })

    function tick() {
        pathElements.attr("d", function(d) {
            var dx = d.target.x - d.source.x,
                dy = d.target.y - d.source.y,
                dr = Math.sqrt(dx * dx + dy * dy);
            return "M" + 
                d.source.x + "," + 
                d.source.y + "A" + 
                dr + "," + dr + " 0 0,1 " + 
                d.target.x + "," + 
                d.target.y;
        });

        nodeElements
            .attr("transform", function(d) { 
            return "translate(" + d.x + "," + d.y + ")"; });
    }
});