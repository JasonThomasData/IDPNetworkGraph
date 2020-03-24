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

function isLinkAtFront(node, link, role, ApplicationRoles) {
    if (role == ApplicationRoles.CLIENT) {
        return isLinkFromSource(node, link) ? true : false
    }
    return isLinkToTarget(node, link) ? true : false
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

    d3.selectAll('path.link')
        .sort(function(a) {
            return isLinkAtFront(selectedNode, a, applicationRole, ApplicationRoles) ? 1 : -1
        })

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

function updateInformation(selectedNode, links, applicationRole, ApplicationRoles, applicationInformationElement, applicationListUpdateCallback) {
    const summaryForThisApplication = summariseApplicationRelationships(selectedNode, links, applicationRole, ApplicationRoles)
    applicationInformationElement.select("ul").selectAll("li").remove()

    if (summaryForThisApplication["clients"].length > 0) {
        applicationInformationElement.style("display", "block")
        const message = "accessed by these clients"
        applicationInformationElement.select("p").text(message)
        summaryForThisApplication["clients"].forEach(function(anApplicationToAppend) {
            applicationToAppend = anApplicationToAppend
            applicationListUpdateCallback(applicationToAppend)
        })
    }
    else if (summaryForThisApplication["resources"].length > 0) {
        applicationInformationElement.style("display", "block")
        const message = "accessed these resource servers"
        applicationInformationElement.select("p").text(message)
        summaryForThisApplication["resources"].forEach(function(anApplicationToAppend) {
            applicationToAppend = anApplicationToAppend
            applicationListUpdateCallback(applicationToAppend)
        })
    }
    else {
        applicationInformationElement.style("display", "none")
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

function getNodesWithRadius(nodes, radius) {
    for (const key in nodes) {
        nodes[key]["radius"] = radius 
    }
    return nodes
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

function appendListElement(applicationInformationElement, dataVizState, links, nodes, ApplicationRoles, nodeElements, pathElements, Colours, application) {
    applicationInformationElement.select("ul")
        .append("li")
        .attr("application_id", application.id)
        .text(application.name)
        .style("color", Colours.HIGHLIGHTED)
        .on("mouseover", function() {
            const listElement = d3.select(this)
            listElement.style("font-weight", "bold")
            listElement.style("color", Colours.HIGHLIGHTED)
            const tempSelectedNode = nodes[listElement.attr("application_id")]
            const oppositeRole = !dataVizState.applicationRole
            updateHighlights(tempSelectedNode, links, oppositeRole, ApplicationRoles, nodeElements, pathElements, Colours)
        })
        .on("mouseout", function() {
            const listElement = d3.select(this)
            listElement.style("font-weight", "normal")
            updateHighlights(dataVizState.selectedNode, links, dataVizState.applicationRole, ApplicationRoles, nodeElements, pathElements, Colours)
        })
        .on("click", function() {
            const listElement = d3.select(this)
            dataVizState.selectedNode = nodes[listElement.attr("application_id")] 
            document.getElementById('application').value = dataVizState.selectedNode.id;
            updateInformation(dataVizState.selectedNode, links, dataVizState.applicationRole, ApplicationRoles, applicationInformationElement, function() { 
                appendListElement(applicationInformationElement, dataVizState, links, nodes, ApplicationRoles, nodeElements, pathElements, Colours, applicationToAppend)
            })
            updateHighlights(dataVizState.selectedNode, links, dataVizState.applicationRole, ApplicationRoles, nodeElements, pathElements, Colours)
        })
}

function collide(node) {
    var collisionRadius = 60,
        nx1 = node.x - collisionRadius,
        nx2 = node.x + collisionRadius,
        ny1 = node.y - collisionRadius,
        ny2 = node.y + collisionRadius;
    return function(quad, x1, y1, x2, y2) {
        if (quad.point && (quad.point !== node)) {
            var x = node.x - quad.point.x,
                y = node.y - quad.point.y,
                l = Math.sqrt(x * x + y * y),
                r = collisionRadius + quad.point.radius;
            if (l < r) {
                l = (l - r) / l * .5;
                node.x -= x *= l;
                node.y -= y *= l;
                quad.point.x += x;
                quad.point.y += y;
            }
        }
        return x1 > nx2 || x2 < nx1 || y1 > ny2 || y2 < ny1;
    };
}

function tick(force, pathElements, nodeElements) {

    const forceNodes = force.nodes()
    const q = d3.geom.quadtree(forceNodes)
    forceNodes.forEach(function(node) {
        q.visit(collide(node))
    })

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

d3.csv("edge-list.csv", function(links) {

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
    nodes = getNodesWithRadius(nodes, 30)
    
    var width = d3.select('#content').node().getBoundingClientRect().width
    var height = d3.select('#content').node().getBoundingClientRect().height

    var force = d3.layout.force()
        .gravity(0.03)
        .nodes(d3.values(nodes))
        .links(links)
        .size([width, height])
        .linkDistance(2)
        .charge(-200)
        .on("tick", function() {
            tick(force, pathElements, nodeElements)
        })
        .start()

    var drag = d3.behavior.drag()
        .on("dragstart", function(){
            const currentTransform = d3.transform(d3.select("g").attr("transform"));
            this.initialX = currentTransform.translate[0]
            this.initialY = currentTransform.translate[1]
            this.initialXDiff = +this.initialX - d3.event.sourceEvent.x
            this.initialYDiff = +this.initialY - d3.event.sourceEvent.y
        })
        .on("drag", function(){

            const newX = d3.event.x + this.initialXDiff
            const newY = d3.event.y + this.initialYDiff
            d3.select("g").attr("transform", "translate(" + newX + "," + newY + ")");
        })

    var svg = d3.select("#content").append("svg")
        .attr("width", width)
        .attr("height", height)
        .call(drag);
        
    var g = svg.append("g")
        .attr("align","right")
        .attr("transform", "translate(0,0)")

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
                updateInformation(dataVizState.selectedNode, links, dataVizState.applicationRole, ApplicationRoles, applicationInformationElement, function() { 
                    appendListElement(applicationInformationElement, dataVizState, links, nodes, ApplicationRoles, nodeElements, pathElements, Colours, applicationToAppend)
                })
                updateHighlights(node, links, dataVizState.applicationRole, ApplicationRoles, nodeElements, pathElements, Colours)
            })

    d3.select("#role")
        .on('change', function() {
            dataVizState.applicationRole = getApplicationRole(ApplicationRoles) 
            updateInformation(dataVizState.selectedNode, links, dataVizState.applicationRole, ApplicationRoles, applicationInformationElement, function() { 
                appendListElement(applicationInformationElement, dataVizState, links, nodes, ApplicationRoles, nodeElements, pathElements, Colours, applicationToAppend)
            })
            updateHighlights(dataVizState.selectedNode, links, dataVizState.applicationRole, ApplicationRoles, nodeElements, pathElements, Colours)
        })

    const nodesSortedByApplicationName = sortNodesByApplicationName(nodes) 
    var applicationSelectElement = d3.select("#application")
        .on('change', function() {
            const applicationId = this.options[this.selectedIndex].value
            dataVizState.selectedNode = nodes[applicationId] 
            updateInformation(dataVizState.selectedNode, links, dataVizState.applicationRole, ApplicationRoles, applicationInformationElement, function() { 
                appendListElement(applicationInformationElement, dataVizState, links, nodes, ApplicationRoles, nodeElements, pathElements, Colours, applicationToAppend)
            })
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
            updateInformation(dataVizState.selectedNode, links, dataVizState.applicationRole, ApplicationRoles, applicationInformationElement, function() { 
                appendListElement(applicationInformationElement, dataVizState, links, nodes, ApplicationRoles, nodeElements, pathElements, Colours, applicationToAppend)
            })
            updateHighlights(dataVizState.selectedNode, links, dataVizState.applicationRole, ApplicationRoles, nodeElements, pathElements, Colours)
        })

    dataVizState.selectedNode = getMostCommonClient(nodes)
    document.getElementById('application').value = dataVizState.selectedNode.id;
    updateLinkVisibility(dataVizState.selectedNode, links, dataVizState.authFlowsIncluded, pathElements, nodeElements)
    updateInformation(dataVizState.selectedNode, links, dataVizState.applicationRole, ApplicationRoles, applicationInformationElement, function() {
        appendListElement(applicationInformationElement, dataVizState, links, nodes, ApplicationRoles, nodeElements, pathElements, Colours, applicationToAppend)
    })
    updateHighlights(dataVizState.selectedNode, links, dataVizState.applicationRole, ApplicationRoles, nodeElements, pathElements, Colours)

});
