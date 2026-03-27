import { Outlet, useLocation, matchPath } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

const PublicLayout = () => {
    const location = useLocation();
    const authPaths = ['/login', '/coordinator/login', '/register', '/admin/login', '/admin/register', '/forgot-password', '/reset-password', '/verify-email', '/unauthorized', '/events'];
    const isAuthPage = authPaths.includes(location.pathname);
    const isClubProfilePage = Boolean(matchPath('/clubs/:id', location.pathname));
    const shouldHideFooter = isAuthPage || isClubProfilePage;

    return (
        <div className={`min-h-screen bg-background flex flex-col antialiased text-foreground overflow-x-hidden ${!isAuthPage ? 'app-style' : ''}`}> 
            {/* when not on login/register pages we apply .app-style which upgrades fonts, sizes, icon handling, etc */}
            <Navbar />
            <main className="flex-grow flex flex-col overflow-x-hidden">
                <Outlet />
            </main>
            {!shouldHideFooter && <Footer />}
        </div>
    );
};


export default PublicLayout;
