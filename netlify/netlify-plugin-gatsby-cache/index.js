/* eslint-disable */
const fs = require('fs-extra')
const path = require('path')

const getNetlifyCacheDirs = ({config, constants}) => {
    const cacheDir = constants.CACHE_DIR
    const gatsbyDir = path.dirname(config.build.publish)

    return {
        config,
        cacheDir,
        gatsbyDir,
        gatsbyCacheDir: path.join(gatsbyDir, '.cache'),
        gatsbyPublicDir: path.join(gatsbyDir, 'public'),
        netlifyCacheDir: path.join(cacheDir, 'gatsby/.cache'),
        netlifyPublicDir: path.join(cacheDir, 'gatsby/public'),
    }
}

module.exports = () => {
    return {
        name: 'netlify-plugin-gatsby-cache',
        preBuild: async args => {
            const {
                config: {build},
                cacheDir,
                gatsbyDir,
                gatsbyCacheDir,
                gatsbyPublicDir,
                netlifyCacheDir,
                netlifyPublicDir,
            } = getNetlifyCacheDirs(args)

            console.log(`Checking gatsby caching paths at: ${gatsbyDir}`)
            console.log(`Against netlify caching paths at: ${cacheDir}`)

            if (!fs.existsSync(netlifyCacheDir) || !fs.existsSync(netlifyPublicDir)) {
                console.log('No Gatsby cache found. Building fresh...')
                return
            }

            await fs.copy(netlifyCacheDir, gatsbyCacheDir)
                .catch(e => console.log(`Error Restoring: ${netlifyPublicDir} @ ${gatsbyPublicDir}`))

            await fs.copy(netlifyPublicDir, gatsbyPublicDir)
                .catch(e => console.log(`Error Restoring: ${netlifyPublicDir} @ ${gatsbyPublicDir}`))

            if (fs.existsSync(gatsbyCacheDir) && fs.existsSync(gatsbyPublicDir)) {
                console.log('Loaded a previous Gatsby cache. Buckle up; we’re about to go FAST. ⚡️',)
            }
        },
        saveCache: async args => {
            const {
                gatsbyCacheDir,
                gatsbyPublicDir,
                netlifyCacheDir,
                netlifyPublicDir,
            } = getNetlifyCacheDirs(args)

            await fs.copy(gatsbyCacheDir, netlifyCacheDir,
                {
                    filter: n => {
                        if (fs.lstatSync(n)
                            .isDirectory()) {
                            return true
                        }
                        console.log('copied', n)
                        return true
                    },
                })
                .catch(e => {
                    console.log(`Error caching ${gatsbyCacheDir}`, e)
                })

            await fs.copy(gatsbyPublicDir, netlifyPublicDir,
                {
                    filter: n => {
                        if (fs.lstatSync(n)
                            .isDirectory()) {
                            return true
                        }
                        const isJsFile = /.*\.(js|js\.map)$/.test(n)
                        const isHtmlFile = /.*\.(html)$/.test(n)
                        const isCssFile = /.*\.(css|css\.map)$/.test(n)
                        const isStaticFile = /.*static\/.*/.test(n)
                        const validFile = !isJsFile && !isHtmlFile && !isCssFile// && !isStaticFile
                        console.log(validFile ? 'copied' : 'skipped', n)

                        // validFile && console.log('copied', n)
                        return validFile
                    },
                })
                .catch(e => {
                    console.log(`Error caching ${gatsbyPublicDir}`, e)
                })

            console.log('Stored the Gatsby cache to speed up future builds.')
            console.log(`Cached: ${gatsbyCacheDir} @ ${netlifyCacheDir}`)
            console.log(`Cached: ${gatsbyPublicDir} @ ${netlifyPublicDir}`)
        }
    }
}
