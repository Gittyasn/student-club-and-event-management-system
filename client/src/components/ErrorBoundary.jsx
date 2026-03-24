import { Component } from 'react';
import { Box, Typography, Button, Container } from '@mui/material';


class ErrorBoundary extends Component {
    state = {
        hasError: false,
        error: null,
        errorInfo: null
    };

    static getDerivedStateFromError(error) {
        return { hasError: true, error, errorInfo: null };
    }

    componentDidCatch(error, errorInfo) {
        console.error('Uncaught error:', error, errorInfo);
        this.setState({ error, errorInfo });
    }

    render() {
        if (this.state.hasError) {
            return (
                <Container maxWidth="md">
                    <Box
                        display="flex"
                        flexDirection="column"
                        alignItems="center"
                        justifyContent="center"
                        minHeight="100vh"
                        textAlign="center"
                        p={4}
                    >
                        <Typography variant="h2" color="error" gutterBottom>
                            Something went wrong
                        </Typography>
                        <Typography variant="body1" color="textSecondary" paragraph>
                            {this.state.error?.message}
                        </Typography>
                        <Box
                            component="pre"
                            sx={{
                                textAlign: 'left',
                                bgcolor: 'grey.100',
                                p: 2,
                                borderRadius: 1,
                                overflow: 'auto',
                                maxWidth: '100%',
                                mb: 4
                            }}
                        >
                            {this.state.errorInfo?.componentStack}
                        </Box>
                        <Button variant="contained" color="primary" onClick={() => window.location.reload()}>
                            Reload Page
                        </Button>
                    </Box>
                </Container>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
