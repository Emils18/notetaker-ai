'use client'
import { motion } from 'framer-motion'
import { Brain } from 'lucide-react'

export default function Logo() {
  return (
    <motion.div 
      whileHover={{ rotate: 360, scale: 1.1 }}
      className="bg-yellow-400 p-4 rounded-2xl border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] cursor-pointer"
    >
      <Brain size={32} className="text-black" />
    </motion.div>
  )
}