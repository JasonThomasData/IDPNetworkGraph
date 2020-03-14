# Visualise authenitcation flows between applications

This is a dataviz to help you understand the relationships between services that use a single Identity Provider (IDP).

I work in a company where many services interact by passing tokens to one another. Those tokens come from an internal Identity Provider, which has implemented the Oauth2/OIDC specs. 

This assumes you log the following:

- For your `/oauth2/authorize` endpoint: `client` id, `resource` id and `return_type`
- For your `/oauth2/token` endpoint: `client` id, `resource` id and `grant_type`

You would need to summarize the logs to be in the data format described below.

# Run it
    
    python -m SimpleHTTPServer 8000

# The data

You may notice the data in this [example](output.csv) contains names for robots. This is because I don't own my company's logs. This is a random dataset that looks like something an auth server might log.

# Viz inspiration

- For an example about how to highlight neighbour nodes, I found [Robin Weser's article](https://medium.com/ninjaconcept/interactive-dynamic-force-directed-graphs-with-d3-da720c6d7811) to be useful
- For more about curved lines that have arrows at the ends, [see this block](https://bl.ocks.org/d3noob/5141278)

# Licence

The MIT Licence applies
