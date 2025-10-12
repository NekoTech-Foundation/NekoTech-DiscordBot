import React from 'react';
import { motion } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faLock, faHome } from '@fortawesome/free-solid-svg-icons';
import { Link } from 'react-router-dom';

export default function AccessDeniedPage() {
    return (
        <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-background via-secondary to-secondary/80 text-foreground">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="max-w-md w-full mx-4 bg-card/50 backdrop-blur-xl rounded-2xl p-8 shadow-lg border border-border"
            >
                <div className="text-center">
                    <div className="bg-destructive/10 w-16 h-16 mx-auto rounded-xl flex items-center justify-center mb-6">
                        <FontAwesomeIcon icon={faLock} className="w-8 h-8 text-destructive" />
                    </div>
                    
                    <h1 className="text-2xl font-bold mb-2 text-foreground">Access Denied</h1>
                    
                    <p className="text-muted-foreground mb-6">
                        You don't have permission to access this page. Please contact an administrator if you believe this is a mistake.
                    </p>

                    <Link 
                        to="/"
                        className="inline-flex items-center gap-2 bg-gradient-to-r from-primary to-primary/80 text-white rounded-xl px-6 py-2.5 text-sm font-medium hover:from-primary/80 hover:to-primary/90 transition-all duration-200"
                    >
                        <FontAwesomeIcon icon={faHome} className="w-4 h-4" />
                        Return Home
                    </Link>
                </div>
            </motion.div>
        </div>
    );
} 