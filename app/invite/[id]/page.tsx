import Link from "next/link";
import { ArrowRight, Gift, Sparkles, UserPlus } from "lucide-react";

export default function InviteLandingPage({ params }: { params: { id: string } }) {
  const inviterId = params.id;

  return (
    <div className="min-h-screen bg-[#09090b] flex flex-col items-center justify-center p-4 sm:p-8 overflow-hidden relative">
      
      {/* Background ambient light effects */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] opacity-20 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-r from-purple-500 via-indigo-500 to-blue-500 blur-[100px] rounded-full mix-blend-screen" />
      </div>

      <div className="absolute bottom-0 right-0 w-[500px] h-[500px] opacity-10 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-tl from-purple-600 to-transparent blur-[120px] rounded-full mix-blend-screen" />
      </div>

      {/* Main Content Card */}
      <div className="relative z-10 max-w-md w-full bg-white/[0.02] border border-white/10 rounded-3xl p-8 sm:p-10 backdrop-blur-xl shadow-2xl flex flex-col items-center text-center">
        
        {/* Animated Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 mb-8 animate-pulse">
          <Sparkles className="h-4 w-4 text-purple-400" />
          <span className="text-xs font-medium text-white/80">Exclusive Invite</span>
        </div>

        {/* Logo/Icon */}
        <div className="relative mb-8 group">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500 to-blue-500 rounded-2xl blur-xl opacity-50 group-hover:opacity-75 transition-opacity duration-500" />
          <div className="relative h-20 w-20 bg-[#0f0f11] rounded-2xl border border-white/10 flex items-center justify-center shadow-inner">
            <Gift className="h-10 w-10 text-white" />
          </div>
        </div>

        <h1 className="text-3xl sm:text-4xl font-bold text-white tracking-tight mb-4">
          You've Been Invited!
        </h1>
        
        <p className="text-white/60 text-sm sm:text-base mb-10 leading-relaxed">
          Your friend has invited you to join IncogniAI. Claim your reward and experience the ultimate AI membership.
        </p>

        {/* Features list */}
        <div className="w-full flex flex-col gap-3 mb-10 text-left">
          <div className="flex items-center gap-3 bg-white/5 rounded-xl p-4 border border-white/5">
            <div className="h-8 w-8 rounded-full bg-purple-500/20 flex items-center justify-center">
              <UserPlus className="h-4 w-4 text-purple-400" />
            </div>
            <div>
              <p className="text-white text-sm font-medium">Join the Community</p>
              <p className="text-white/40 text-xs">Unlock exclusive features.</p>
            </div>
          </div>
        </div>

        {/* Call to action */}
        <Link 
          href={`/?ref=${inviterId}`}
          className="group relative w-full inline-flex items-center justify-center px-8 py-4 font-semibold text-white transition-all duration-300 bg-white/10 border border-white/20 rounded-full hover:bg-white flex-row gap-2 overflow-hidden hover:text-black hover:shadow-[0_0_40px_rgba(255,255,255,0.3)]"
        >
          <span className="relative z-10 flex items-center gap-2">
            Accept Invite & Join
            <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
          </span>
          <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-blue-500 opacity-0 group-hover:opacity-10 transition-opacity duration-300" />
        </Link>
        
        <p className="text-white/30 text-xs mt-6">
          By joining, you agree to our Terms of Service.
        </p>

      </div>
    </div>
  );
}
