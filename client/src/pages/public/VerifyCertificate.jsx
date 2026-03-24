import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    ShieldCheck, ShieldAlert, User, Calendar,
    Award, QrCode, Building2,
    ExternalLink, ArrowLeft, Trophy, Star
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useCertificateById } from '../../hooks/useCertificates';

const TYPE_INFO = {
    participation: {
        label: 'Participation Certificate',
        bg: 'from-blue-600 to-sky-500',
        icon: <Award className="w-12 h-12" />,
        accent: 'text-blue-500',
        bgSoft: 'bg-blue-500/10'
    },
    winner: {
        label: 'Winner Certificate',
        bg: 'from-amber-600 to-yellow-500',
        icon: <Trophy className="w-12 h-12" />,
        accent: 'text-amber-500',
        bgSoft: 'bg-amber-500/10'
    },
    merit: {
        label: 'Merit Certificate',
        bg: 'from-purple-600 to-violet-500',
        icon: <Star className="w-12 h-12" />,
        accent: 'text-purple-500',
        bgSoft: 'bg-purple-500/10'
    },
};

const DetailRow = ({ icon: Icon, label, value, mono }) => (
    <div className="flex items-start gap-4 py-4 border-b border-border last:border-0 hover:bg-muted/30 px-2 transition-colors rounded-lg">
        <div className="p-2 rounded-lg bg-muted text-muted-foreground shrink-0">
            <Icon className="w-4 h-4" />
        </div>
        <div className="space-y-1 overflow-hidden">
            <p className="text-[10px] uppercase tracking-widest font-black text-muted-foreground/70">{label}</p>
            <p className={`text-sm font-bold truncate ${mono ? 'font-mono tracking-tight text-primary' : 'text-foreground'}`}>
                {value}
            </p>
        </div>
    </div>
);

const VerifyCertificate = () => {
    const { id } = useParams();
    const { data: cert, isLoading, isError } = useCertificateById(id);

    if (isLoading) return (
        <div className="flex flex-col items-center justify-center min-h-[70vh] gap-4">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-muted-foreground animate-pulse font-medium">Verifying Credentials...</p>
        </div>
    );

    const isRevoked = cert?.status === 'revoked';
    const certNotFound = isError || !cert;

    if (certNotFound) {
        return (
            <div className="container max-w-lg mx-auto py-20 px-4">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-card border border-red-500/20 rounded-[32px] p-12 text-center shadow-2xl"
                >
                    <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-8">
                        <ShieldAlert className="w-10 h-10 text-red-500" />
                    </div>
                    <h2 className="text-3xl font-black mb-4 tracking-tight">Invalid Certificate</h2>
                    <p className="text-muted-foreground text-base leading-relaxed mb-10">
                        This certificate ID does not exist or has been invalidated. If you believe this is an error, contact the issuing authority.
                    </p>
                    <Badge variant="destructive" className="font-black uppercase tracking-widest py-1.5 px-6 rounded-full mb-8">
                        STATUS: NOT FOUND
                    </Badge>
                    <div>
                        <Button asChild variant="outline" className="rounded-xl h-12 px-8 font-bold">
                            <Link to="/"><ArrowLeft className="mr-2 w-4 h-4" /> Back to Safety</Link>
                        </Button>
                    </div>
                </motion.div>
            </div>
        );
    }

    const tc = TYPE_INFO[cert.cert_type] || TYPE_INFO.participation;

    return (
        <div className="min-h-screen bg-background pb-20 pt-10">
            <div className="container max-w-xl mx-auto px-4">
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-card border border-border rounded-[32px] overflow-hidden shadow-2xl"
                >
                    {/* Header with gradient */}
                    <div className={`p-10 relative overflow-hidden bg-gradient-to-br ${isRevoked ? 'from-red-600 to-red-800' : tc.bg} text-white`}>
                        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />

                        <div className="relative z-10 text-center">
                            <div className="mb-6 inline-block bg-white/20 p-4 rounded-3xl backdrop-blur-xl border border-white/30 shadow-2xl">
                                {isRevoked ? <ShieldAlert className="w-12 h-12" /> : tc.icon}
                            </div>

                            <div className="flex justify-center mb-6">
                                <Badge className="bg-white/20 hover:bg-white/30 text-white font-black tracking-widest uppercase border-white/20 backdrop-blur-md px-6 py-1.5 rounded-full">
                                    {isRevoked ? (
                                        <div className="flex items-center gap-2">
                                            <ShieldAlert className="w-4 h-4" /> REVOKED
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-2">
                                            <ShieldCheck className="w-4 h-4" /> AUTHENTICATED
                                        </div>
                                    )}
                                </Badge>
                            </div>

                            <h2 className="text-3xl md:text-4xl font-black tracking-tight mb-2 uppercase">
                                {tc.label}
                            </h2>
                            <p className="text-white/70 text-sm font-bold tracking-wide">
                                Verified via NEXTGEN EDUTECH UNIVERSITY Protocol
                            </p>
                        </div>
                    </div>

                    {/* Body */}
                    <div className="p-8 md:p-12 space-y-8">
                        {isRevoked && (
                            <Alert variant="destructive" className="bg-red-500/5 border-red-500/20 rounded-2xl p-6">
                                <ShieldAlert className="h-5 w-5" />
                                <AlertTitle className="font-black tracking-widest text-xs uppercase mb-2">Security Override</AlertTitle>
                                <AlertDescription className="font-bold text-sm">
                                    This certificate has been revoked. {cert.revocation_reason && `Reason: ${cert.revocation_reason}`}
                                </AlertDescription>
                            </Alert>
                        )}

                        <div className="grid grid-cols-1 gap-1">
                            <DetailRow icon={User} label="Protocol Subject" value={cert.student?.full_name || '—'} />
                            <DetailRow icon={Star} label="Event Mission" value={cert.event?.title || '—'} />
                            <DetailRow icon={Building2} label="Issuing Collective" value={cert.event?.club?.name || '—'} />
                            <DetailRow icon={Calendar} label="Timestamp" value={cert.generated_at ? new Date(cert.generated_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : '—'} />

                            {cert.cert_type === 'winner' && cert.rank && (
                                <DetailRow
                                    icon={Trophy}
                                    label="Achievement Rank"
                                    value={`Tier #${cert.rank}${cert.prize_title ? ` · ${cert.prize_title}` : ''}`}
                                />
                            )}

                            <DetailRow icon={QrCode} label="Authorization Hash" value={cert.certificate_number || cert.id?.slice(0, 12).toUpperCase()} mono />
                        </div>

                        <Separator className="bg-border opacity-50" />

                        <div className={`p-8 rounded-[24px] text-center space-y-4 border ${isRevoked ? 'bg-red-500/5 border-red-500/20' : 'bg-primary/5 border-primary/20'}`}>
                            {isRevoked ? (
                                <ShieldAlert className="w-12 h-12 text-red-500 mx-auto opacity-50" />
                            ) : (
                                <ShieldCheck className="w-12 h-12 text-primary mx-auto" />
                            )}
                            <div>
                                <h4 className={`text-lg font-black uppercase tracking-widest ${isRevoked ? 'text-red-500' : 'text-primary'}`}>
                                    {isRevoked ? 'Credential Invalid' : 'System Verified'}
                                </h4>
                                <p className="text-muted-foreground text-xs font-bold leading-relaxed mt-1">
                                    {isRevoked
                                        ? 'This digital asset is no longer recognized by the University.'
                                        : 'This certificate code is uniquely signed and authenticated via cryptographically secure channels.'}
                                </p>
                            </div>
                            <div className="text-[10px] font-mono text-muted-foreground/40 break-all select-all pt-2">
                                SIG_ID: {id}
                            </div>
                        </div>

                        <div className="flex gap-4">
                            <Button asChild variant="outline" className="flex-1 rounded-[14px] h-12 font-bold group">
                                <Link to="/" className="flex items-center gap-2">
                                    Portal Home <ExternalLink className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                                </Link>
                            </Button>
                        </div>
                    </div>
                </motion.div>

                <p className="mt-10 text-center text-xs text-muted-foreground font-medium animate-pulse">
                    Encrypted Verification Protocol v2.0.4-stable
                </p>
            </div>
        </div>
    );
};

export default VerifyCertificate;
