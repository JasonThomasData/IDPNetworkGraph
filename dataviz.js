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

function updateDataViz(selectedNode, links, role, ApplicationRoles, nodeElements, pathElements, Colours) {
    var neighbourIds = getNeighbourIdsDependingOnRole(selectedNode, links, role, ApplicationRoles)

    nodeElements.attr('fill', function (node) { return getNodeColor(node, neighbourIds, Colours) })
    pathElements.attr('stroke', function (link) { return getLinkColor(selectedNode, link, role, ApplicationRoles, Colours) })
    pathElements.attr('marker-end', function (link) { return getMarkerEnd(selectedNode, link, role, ApplicationRoles) })
}

function updateInformation(selectedNode, links, role, ApplicationRoles, nodeElements, pathElements, Colours) {
    var neighbourIds = getNeighbourIdsDependingOnRole(selectedNode, links, role, ApplicationRoles)

    nodeElements.attr('fill', function (node) { return getNodeColor(node, neighbourIds, Colours) })
    pathElements.attr('stroke', function (link) { return getLinkColor(selectedNode, link, role, ApplicationRoles, Colours) })
    pathElements.attr('marker-end', function (link) { return getMarkerEnd(selectedNode, link, role, ApplicationRoles) })
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

d3.csv("output.csv", function(links) {

    const Colours = {
        PURPLE: {
            BASE: '#e8c2ff',
            HIGHLIGHTED: '#8241AA'
        },
        BLUE: {
            BASE: '#c5dafc',
            HIGHLIGHTED: '#2B74DF'
        },
        GREEN: {
            BASE: '#bfffe6',
            HIGHLIGHTED: '#00AA65'
        },
        RED: {
            BASE: '#ffbacd',
            HIGHLIGHTED: '#CE2554'
        },
            BASE: '#c5dafc',
            HIGHLIGHTED: '#2B74DF'
    }

    const ApplicationRoles = {
        CLIENT: 0,
        RESOURCE: 1
    }

    var dataVizState = {
        selectedNode: null,
        applicationRole: getApplicationRole(ApplicationRoles) 
    }

    var nodes = {};
    //In this graph, source == client_id and target == resource_id
    links.forEach(function(link) {
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
    console.log(nodes)
    
    var width = d3.select('#dataviz').node().getBoundingClientRect().width
    var height = d3.select('#dataviz').node().getBoundingClientRect().height

    //d3.select("#code-flow-colour").style("background-color", Colours["PURPLE"].BASE)
        d3.select("#code-flow-colour").selectAll("rect")
            .data(function() {
                var coloursArray = []
                for (var key in Colours) {
                    coloursArray.push(Colours[key])
                }
                return coloursArray
            })
            .enter()
            .append("rect")
            .attr("width", 20)
            .attr("height", 20)
            .attr("x", function(d, i) {
                return 20 * i + 4 
            })
            .attr("y", 0)
            .attr("fill", function(d) {
                return d.BASE
            })
            .style("stroke-width", "2")
            .style("stroke", function(d) {
                return d.BASE
            })
            .on("click", function(d) {
                d3.select(this).style("stroke", "#fff")
            })
    //console.log(d3.select("#code-flow-colour").node().options[i].style)

    var nodesSortedByApplicationName = sortNodesByApplicationName(nodes) 
    var applicationElement = d3.select("#application")
    nodesSortedByApplicationName.forEach(function(node) {
        applicationElement.append("option")
            .attr("value", node.id)
            .text(node.name)
    })
    
    //Centre the graph in the middle of the page
    //Make the centre vertex, or root node, unmoving, or hard to move
    var force = d3.layout.force()
        .nodes(d3.values(nodes))
        .links(links)
        .size([width, height])
        .linkDistance(15)
        .charge(function(d, i) { return d.weight * -150; })
        .on("tick", tick)

    force.start();

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
        .attr("cursor", "grab")
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
                updateDataViz(node, links, dataVizState.applicationRole, ApplicationRoles, nodeElements, pathElements, Colours)
            })

    d3.select("#role")
        .on('change', function() {
            dataVizState.applicationRole = getApplicationRole(ApplicationRoles) 
            updateDataViz(dataVizState.selectedNode, links, dataVizState.applicationRole, ApplicationRoles, nodeElements, pathElements, Colours)
        })

    var applicationSelectElement = d3.select("#application")
        .on('change', function() {
            var applicationId = this.options[this.selectedIndex].value
            dataVizState.selectedNode = nodes[applicationId] 
            updateInformation(dataVizState.selectedNode, links, dataVizState.applicationRole, ApplicationRoles, nodeElements, pathElements, Colours)
            updateDataViz(dataVizState.selectedNode, links, dataVizState.applicationRole, ApplicationRoles, nodeElements, pathElements, Colours)
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