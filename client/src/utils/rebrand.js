/**
 * University Brand Utility
 * Standardizes names and descriptions for the NEXTGEN EDUTECH UNIVERSITY portal.
 */

export const rebrandName = (name) => {
    if (!name) return '';
    return name
        .replace(/Robotics & AI League/g, 'Smart Robotics & Automation League')
        .replace(/AI & Data Science Club/g, 'Data Analytics & Smart Systems Club')
        .replace(/AI Workshop/g, 'Smart Systems Workshop')
        .replace(/AI/g, 'Smart')
        .replace(/artificial intelligence/gi, 'intelligent automation')
        .replace(/Data Science/g, 'Data Analytics');
};

export const rebrandDescription = (desc) => {
    if (!desc) return '';
    return desc
        .replace(/AI/g, 'Smart')
        .replace(/artificial intelligence/gi, 'intelligent automation')
        .replace(/Robots/g, 'Systems')
        .replace(/Machine Learning/g, 'Intelligent Systems');
};
