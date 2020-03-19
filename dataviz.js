function getApplicationRole(ApplicationRoles) {
    const roleSelectedElement = document.getElementById('role');
    const roleSelected = roleSelectedElement.options[roleSelectedElement.selectedIndex].value; 
    return ApplicationRoles[roleSelected]
}

function getNeighbourIdsDependingOnRole(node, links, role, ApplicationRoles) {
    return links.reduce(function (neighbors, link) {
        if (role == ApplicationRoles.RESOURCE && link.target.id === node.id && link.visible == true) {
            neighbors.push(link.source.id)
        } else if (role == ApplicationRoles.CLIENT && link.source.id === node.id && link.visible == true) {
            neighbors.push(link.target.id)
        }
        return neighbors
    },
    [node.id]
    )
}

function summariseApplicationRelationships(node, links, role, ApplicationRoles) {
    var summaryForThisApplication = {
        "clients": [],
        "resources": []
    }
    links.forEach(function (link) {
        if (role == ApplicationRoles.RESOURCE && link.target.id === node.id && link.visible == true) {
            summaryForThisApplication["clients"].push(link.source)
        } else if (role == ApplicationRoles.CLIENT && link.source.id === node.id && link.visible == true) {
            summaryForThisApplication["resources"].push(link.target)
        }
    })
    return summaryForThisApplication
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
    return authFlowsIncluded["client_credentials_flow"] && link.client_credentials_flow > 0 ||
        authFlowsIncluded["code_flow"] && link.code_flow > 0 ||
        authFlowsIncluded["implicit_flow"] && link.implicit_flow > 0 ||
        authFlowsIncluded["password_flow"] && link.password_flow > 0 ||
        authFlowsIncluded["refresh_token_flow"] && link.refresh_token_flow > 0 ||
        authFlowsIncluded["token_exchange_flow"] && link.token_exchange_flow > 0
}

function updateHighlights(selectedNode, links, applicationRole, ApplicationRoles, nodeElements, pathElements, Colours) {
    const neighbourIds = getNeighbourIdsDependingOnRole(selectedNode, links, applicationRole, ApplicationRoles)

    nodeElements.attr('fill', function (node) { return getNodeColor(node, neighbourIds, Colours) })
    pathElements.attr('stroke', function (link) { return getLinkColor(selectedNode, link, applicationRole, ApplicationRoles, Colours) })
    pathElements.attr('marker-end', function (link) { return getMarkerEnd(selectedNode, link, applicationRole, ApplicationRoles) })
}

function updateLinkVisibility(nodes, links, authFlowsIncluded, pathElements, nodeElements) {
    links.forEach(function(link) {
        link["visible"] = getLinkVisibility(link, authFlowsIncluded)
    })
    pathElements.style('visibility', function (link) { return link["visible"] ? "visible" : "hidden" })
}

function updateInformation(selectedNode, links, role, ApplicationRoles, applicationInformation) {
    const summaryForThisApplication = summariseApplicationRelationships(selectedNode, links, role, ApplicationRoles)
    applicationInformation.select("ul").selectAll("li").remove()

    if (summaryForThisApplication["clients"].length > 0) {
        applicationInformation.style("display", "block")
        const message = "- accessed by these clients"
        applicationInformation.select("p").text(message)
        summaryForThisApplication["clients"].forEach(function(client) {
            applicationInformation.select("ul").append("li").text(client.name)
        })
    }
    else if (summaryForThisApplication["resources"].length > 0) {
        applicationInformation.style("display", "block")
        const message = "- accessed these resource servers"
        applicationInformation.select("p").text(message)
        summaryForThisApplication["resources"].forEach(function(resource) {
            applicationInformation.select("ul").append("li").text(resource.name)
        })
    }
    else {
        applicationInformation.style("display", "none")
    }
}

function sortNodesByApplicationName(nodes) {
    const nodeKeys = Object.keys(nodes).sort()
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

function addVisibleFieldToLinks(linksLoaded) {
    var linksWithNewField = []
    linksLoaded.forEach(function(link) {
        link["visible"] = true;
        linksWithNewField.push(link)
    })
    return linksWithNewField
}

function getNodes(links) {
    var nodes = {};
    //In this graph, source == client_id and target == resource_id
    links.forEach(function(link) {
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

function getMostCommonClient(nodes) {
    var mostCommentClient = nodes[Object.keys(nodes)[0]];
    for (const key in nodes) {
        if (nodes[key].weight > mostCommentClient.weight) {
            mostCommentClient = nodes[key]
        }
    }
    return mostCommentClient;
}

d3.csv("output.csv", function(links) {

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
            "client_credentials_flow": true,
            "code_flow": true,
            "implicit_flow": true,
            "password_flow": true,
            "refresh_token_flow": true,
            "token_exchange_flow": true 
        }
    }

    var links = addVisibleFieldToLinks(links);
    var nodes = getNodes(links);
    
    var width = d3.select('#dataviz').node().getBoundingClientRect().width
    var height = d3.select('#dataviz').node().getBoundingClientRect().height

    var force = d3.layout.force()
        .nodes(d3.values(nodes))
        .links(links)
        .size([width, height])
        .linkDistance(15)
        .charge(function(d, i) { return d.weight * -100 - 100; })
        .on("tick", tick)
        .start()

    var svg = d3.select("#dataviz").append("svg")
        .attr("width", width)
        .attr("height", height)
        .attr("viewBox", "-120 -100 " + width*1.3 + " " + height*1.3 )

    var g = svg.append("g")
        .attr("align","center")

    var applicationInformationElement = d3.select("#applications-list")

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
        .attr("d", "M0,-6L10,0L0,6")
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
        .attr("d", "M0,-4L10,0L0,4")
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
                updateInformation(node, links, dataVizState.applicationRole, ApplicationRoles, applicationInformationElement)
                updateHighlights(node, links, dataVizState.applicationRole, ApplicationRoles, nodeElements, pathElements, Colours)
            })

    d3.select("#role")
        .on('change', function() {
            dataVizState.applicationRole = getApplicationRole(ApplicationRoles) 
            updateInformation(dataVizState.selectedNode, links, dataVizState.applicationRole, ApplicationRoles, applicationInformationElement)
            updateHighlights(dataVizState.selectedNode, links, dataVizState.applicationRole, ApplicationRoles, nodeElements, pathElements, Colours)
        })

    const nodesSortedByApplicationName = sortNodesByApplicationName(nodes) 
    var applicationSelectElement = d3.select("#application")
        .on('change', function() {
            const applicationId = this.options[this.selectedIndex].value
            dataVizState.selectedNode = nodes[applicationId] 
            updateInformation(dataVizState.selectedNode, links, dataVizState.applicationRole, ApplicationRoles, applicationInformationElement)
            updateHighlights(dataVizState.selectedNode, links, dataVizState.applicationRole, ApplicationRoles, nodeElements, pathElements, Colours)
        })
    nodesSortedByApplicationName.forEach(function(node) {
        applicationSelectElement.append("option")
            .attr("value", node.id)
            .text(node.name)
    })
    
    d3.selectAll(".auth-flow-toggle")
        .on("change", function() {
            const checkBoxId = d3.select(this).property("id")
            const checkBoxChecked = d3.select(this).property("checked")
            dataVizState.authFlowsIncluded[checkBoxId] = checkBoxChecked

            updateLinkVisibility(nodes, links, dataVizState.authFlowsIncluded, pathElements, nodeElements)
            updateInformation(dataVizState.selectedNode, links, dataVizState.applicationRole, ApplicationRoles, applicationInformationElement)
            updateHighlights(dataVizState.selectedNode, links, dataVizState.applicationRole, ApplicationRoles, nodeElements, pathElements, Colours)
        })

    dataVizState.selectedNode = getMostCommonClient(nodes)
    updateLinkVisibility(dataVizState.selectedNode, links, dataVizState.authFlowsIncluded, pathElements, nodeElements)
    updateInformation(dataVizState.selectedNode, links, dataVizState.applicationRole, ApplicationRoles, applicationInformationElement)
    updateHighlights(dataVizState.selectedNode, links, dataVizState.applicationRole, ApplicationRoles, nodeElements, pathElements, Colours)

    function tick() {
        pathElements.attr("d", function(d) {
            const dx = d.target.x - d.source.x,
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