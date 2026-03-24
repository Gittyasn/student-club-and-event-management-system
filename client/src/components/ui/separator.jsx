// eslint-disable-next-line no-unused-vars
import * as React from "react"
// eslint-disable-next-line no-unused-vars
import { motion } from "framer-motion"

const Separator = ({ className, ...props }) => {
    return (
        <div
            className={`shrink-0 bg-slate-200 dark:bg-slate-800 h-[1px] w-full ${className}`}
            {...props}
        />
    )
}

export { Separator }
