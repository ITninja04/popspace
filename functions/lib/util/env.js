const isLocalhost = (host) => {
  return host.includes("localhost") || host.includes("127.0.0.1")
}


const env = {
  init: (envVars) => {
    const definedEnv = process.env.NODE_ENV
    console.log(`definedEnv`, definedEnv)
    for (const key of Object.keys(envVars)) {
      process.env[key] = envVars[key]
    }
    // restore defined env if it was present
    if (definedEnv) {
      process.env.NODE_ENV = definedEnv
    }
    return env
  },

  isDev: () => {
    return process.env.NODE_ENV === "development"
  },

  appUrl: (netlifyEvent, netlifyContext) => {
    if (netlifyEvent.headers.host) {
      console.log("Through netlifyEvent", netlifyEvent.headers.host)
      const protocol = env.isDev() || isLocalhost(netlifyEvent.headers.host) ? "http" : "https"
      return `${protocol}://${netlifyEvent.headers.host}`
    } else {
      // Note: this is weird, huh?
      // Here is a thread about it:
      // https://community.netlify.com/t/knowing-the-current-public-hostname-of-a-netlify-function/7160
      // Here is another one:
      // https://community.netlify.com/t/x-forwarded-host/7104
      // Where they promise that they don't intendt to break this way of fetching the domain.
      // Alternatievely. we could parse it out of netlifyEvent.headers.referer,
      // but it includes the /path after the url, like
      // https://deploy-preview-157--with-app.netlify.app/signup
      const data = netlifyContext.clientContext.custom.netlify
      const url = JSON.parse(Buffer.from(data, "base64").toString("utf-8"))
        .site_url
      console.log("Through clientContext", url)
      return `${url}`
    }
  }
}

module.exports = env
