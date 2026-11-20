import React from 'react';
import { X, Building2, Globe, Phone, Mail, Award, Target, Compass, MapPin } from 'lucide-react';

export default function AboutModal({ profile, onClose }) {
  if (!profile) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-3xl w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white p-6 relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-slate-300 hover:text-white hover:bg-white/10 rounded-full transition"
          >
            <X className="w-5 h-5" />
          </button>
          
          <div className="flex items-center space-x-4">
            <img
              src="/images/logo.png"
              alt="College Crest"
              className="h-16 w-16 bg-white/10 p-1.5 rounded-xl object-contain border border-white/20"
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = "https://www.drbccchinducollege.edu.in/images/logo-hindu-college2.png";
              }}
            />
            <div>
              <div className="inline-block px-2.5 py-0.5 bg-blue-500/30 border border-blue-400/40 rounded-full text-[11px] font-semibold tracking-wide text-blue-200 mb-1">
                Verified Institutional Information
              </div>
              <h2 className="text-lg sm:text-xl font-extrabold tracking-tight">
                {profile.college_name}
              </h2>
              <p className="text-xs text-blue-200/90 mt-0.5">
                {profile.director_info}
              </p>
            </div>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {/* Key Facts */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-3.5 bg-slate-50 border border-slate-100 rounded-xl flex items-start space-x-3">
              <Award className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div>
                <div className="text-[11px] uppercase font-bold text-slate-400 tracking-wider">Principal</div>
                <div className="text-sm font-bold text-slate-800">{profile.principal_name}</div>
              </div>
            </div>

            <div className="p-3.5 bg-slate-50 border border-slate-100 rounded-xl flex items-start space-x-3">
              <MapPin className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div>
                <div className="text-[11px] uppercase font-bold text-slate-400 tracking-wider">Location</div>
                <div className="text-sm font-bold text-slate-800">{profile.address}, {profile.city} - {profile.pincode}</div>
              </div>
            </div>

            <div className="p-3.5 bg-slate-50 border border-slate-100 rounded-xl flex items-start space-x-3">
              <Phone className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div>
                <div className="text-[11px] uppercase font-bold text-slate-400 tracking-wider">Official Phone</div>
                <div className="text-sm font-bold text-slate-800">{profile.official_phone_numbers}</div>
              </div>
            </div>

            <div className="p-3.5 bg-slate-50 border border-slate-100 rounded-xl flex items-start space-x-3">
              <Mail className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div>
                <div className="text-[11px] uppercase font-bold text-slate-400 tracking-wider">Official Email</div>
                <div className="text-xs font-semibold text-slate-800 break-all">{profile.official_email_addresses}</div>
              </div>
            </div>
          </div>

          {/* About */}
          <div>
            <h3 className="text-xs uppercase font-extrabold text-slate-400 tracking-wider flex items-center gap-1.5 mb-2">
              <Building2 className="w-4 h-4 text-slate-500" />
              About College
            </h3>
            <p className="text-sm text-slate-700 leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-100">
              {profile.about_college}
            </p>
          </div>

          {/* Vision & Mission */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-blue-50/70 border border-blue-100 p-4 rounded-xl">
              <div className="flex items-center gap-2 text-blue-900 font-bold text-xs uppercase tracking-wider mb-2">
                <Target className="w-4 h-4 text-blue-600" />
                Our Vision
              </div>
              <p className="text-xs text-slate-700 leading-relaxed">
                "{profile.vision}"
              </p>
            </div>

            <div className="bg-indigo-50/70 border border-indigo-100 p-4 rounded-xl">
              <div className="flex items-center gap-2 text-indigo-900 font-bold text-xs uppercase tracking-wider mb-2">
                <Compass className="w-4 h-4 text-indigo-600" />
                Our Mission
              </div>
              <p className="text-xs text-slate-700 leading-relaxed">
                "{profile.mission}"
              </p>
            </div>
          </div>

          {/* Official Website link */}
          <div className="pt-2 flex items-center justify-between border-t border-slate-100">
            <a
              href={profile.official_website}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 text-xs font-bold text-blue-600 hover:text-blue-800 hover:underline"
            >
              <Globe className="w-4 h-4" />
              <span>Visit Official College Website ({profile.official_website})</span>
            </a>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-lg transition"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
