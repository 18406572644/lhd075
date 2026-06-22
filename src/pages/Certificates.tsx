import { useEffect, useRef, useState } from 'react';
import { Award, Download, FileImage, FileText, Medal } from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import api from '@/lib/api';
import useAuthStore from '@/store/auth';
import useChallengeStore from '@/store/challenges';
import type { CertificateData } from '@shared/types';

function CertificateView({ cert }: { cert: CertificateData }) {
  return (
    <div
      className="relative p-12 bg-[#FAF7F2] border-[14px] border-double border-amber-400/70 max-w-full"
      style={{
        width: '800px',
        maxWidth: '100%',
        minHeight: '560px',
        fontFamily: "'Noto Serif SC', 'Songti SC', serif",
        boxShadow: 'inset 0 0 0 3px #D4A853, inset 0 0 0 6px #FAF7F2, inset 0 0 0 9px rgba(212,168,83,0.3)',
        backgroundImage:
          "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100'%3E%3Cpath d='M0 0h100v100H0z' fill='none'/%3E%3Cpath d='M50 0 L100 50 L50 100 L0 50 Z' fill='%23f5efe4' fill-opacity='0.5'/%3E%3C/svg%3E\")",
      }}
    >
      <div className="absolute top-6 left-6 w-16 h-16 rounded-full border-2 border-amber-600/50 flex items-center justify-center opacity-40">
        <Award size={32} className="text-amber-700" />
      </div>
      <div className="absolute top-6 right-6 w-16 h-16 rounded-full border-2 border-amber-600/50 flex items-center justify-center opacity-40">
        <Medal size={32} className="text-amber-700" />
      </div>
      <div className="text-center">
        <p className="text-sm tracking-[0.5em] text-amber-700/70 mb-2">CERTIFICATE OF ACHIEVEMENT</p>
        <h1
          className="text-5xl font-bold text-amber-900 mb-1"
          style={{ fontFamily: "'Playfair Display', 'Noto Serif SC', serif" }}
        >
          成就证书
        </h1>
        <div className="w-24 h-px bg-gradient-to-r from-transparent via-amber-600 to-transparent mx-auto my-4" />
        <p className="text-sm text-neutral-500 mb-10">特此颁发给</p>
        <h2
          className="text-4xl text-neutral-900 mb-8"
          style={{ fontFamily: "'Ma Shan Zheng', 'Noto Serif SC', cursive" }}
        >
          {cert.memberName}
        </h2>
        <p className="text-base text-neutral-600 mb-4">
          恭喜您完成了「<span className="font-bold text-amber-800">{cert.challengeName}</span>」
        </p>
        <p className="text-base text-neutral-600 mb-8">
          在 {cert.totalDays} 天的挑战中，累计打卡
          <span className="font-bold text-primary-600 mx-1 text-lg">{cert.checkinDays}</span> 天
          <br />
          总运动时长达到
          <span className="font-bold text-secondary-700 mx-1 text-lg">
            {Math.round(cert.totalDuration / 60)} 小时
          </span>
          ，完成率
          <span className="font-bold text-amber-700 mx-1 text-lg">{cert.completionRate}%</span>
        </p>
        <div
          className="inline-block px-8 py-3 rounded-full bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-400/50 mb-10"
          style={{ fontFamily: "'Ma Shan Zheng', cursive" }}
        >
          <span className="text-2xl text-amber-800">🏆 荣获「{cert.achievement}」称号 🏆</span>
        </div>
        <div className="flex items-center justify-between px-4">
          <div className="text-left">
            <p className="text-xs text-neutral-400 mb-1">颁发机构</p>
            <p className="text-base font-bold text-neutral-700">FitChallenge 运动平台</p>
          </div>
          <div className="flex items-center gap-2">
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center text-amber-700 opacity-80"
              style={{
                border: '3px solid rgba(180,100,40,0.4)',
                fontFamily: "'Ma Shan Zheng', cursive",
                transform: 'rotate(-8deg)',
                background:
                  'radial-gradient(circle, rgba(255,230,180,0.6) 0%, rgba(255,230,180,0.1) 70%)',
              }}
            >
              <span className="text-sm font-bold text-center leading-tight">
                Fit
                <br />
                Challenge
                <br />
                认证
              </span>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-neutral-400 mb-1">颁发日期</p>
            <p className="text-base font-bold text-neutral-700">
              {new Date(cert.issuedAt).toLocaleDateString('zh-CN', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CertificatesPage() {
  const { user } = useAuthStore();
  const { challenges, fetchAll } = useChallengeStore();
  const [certs, setCerts] = useState<CertificateData[]>([]);
  const [selectedChallenge, setSelectedChallenge] = useState<string>('');
  const [currentCert, setCurrentCert] = useState<CertificateData | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const certRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState<'png' | 'pdf' | null>(null);

  useEffect(() => {
    if (!user) return;
    fetchAll(user.id).then(() => {
      const store = useChallengeStore.getState();
      const ended = store.challenges.filter(
        (c) => c.status === 'ended' || c.memberIds.includes(user.id)
      );
      if (ended[0]) setSelectedChallenge(ended[0].id);
    });
    api.certificates.getByMember(user.id).then((r) => r.success && setCerts(r.data || []));
  }, [user]);

  useEffect(() => {
    if (!selectedChallenge || !user) return;
    setError('');
    setLoading(true);
    api.certificates.getOrCreate(selectedChallenge, user.id).then((r) => {
      setLoading(false);
      if (r.success) {
        setCurrentCert(r.data || null);
      } else {
        setCurrentCert(null);
        setError(r.error?.message || '无法生成证书');
      }
    });
  }, [selectedChallenge, user]);

  const currentChallenge = challenges.find((c) => c.id === selectedChallenge);

  const exportPng = async () => {
    if (!certRef.current) return;
    setExporting('png');
    try {
      const canvas = await html2canvas(certRef.current, { scale: 2, backgroundColor: '#FAF7F2' });
      const link = document.createElement('a');
      link.download = `${currentChallenge?.name || '证书'}_${user?.name}_证书.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } finally {
      setExporting(null);
    }
  };

  const exportPdf = async () => {
    if (!certRef.current) return;
    setExporting('pdf');
    try {
      const canvas = await html2canvas(certRef.current, { scale: 2, backgroundColor: '#FAF7F2' });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
      const w = imgWidth * ratio;
      const h = imgHeight * ratio;
      const x = (pdfWidth - w) / 2;
      const y = (pdfHeight - h) / 2;
      pdf.addImage(imgData, 'PNG', x, y, w, h);
      pdf.save(`${currentChallenge?.name || '证书'}_${user?.name}_证书.pdf`);
    } finally {
      setExporting(null);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="font-display font-bold text-3xl text-neutral-800 mb-1 flex items-center gap-2">
            <Award size={28} className="text-amber-600" /> 证书中心
          </h1>
          <p className="text-neutral-500">
            每一份坚持都值得被铭记 · 已获得 {certs.length} 份证书
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={selectedChallenge}
            onChange={(e) => setSelectedChallenge(e.target.value)}
            className="px-4 py-2.5 rounded-xl border border-neutral-200 bg-white text-sm font-medium focus:border-primary-400 focus:ring-2 focus:ring-primary-100 outline-none"
          >
            {challenges
              .filter((c) => c.memberIds.includes(user?.id || '') || user?.role === 'admin')
              .map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.status === 'ended' ? '（已结束）' : ''}
                </option>
              ))}
          </select>
        </div>
      </div>

      {certs.length > 0 && (
        <div className="p-5 rounded-2xl bg-gradient-to-r from-amber-50 via-orange-50 to-yellow-50 border border-amber-200">
          <p className="text-sm text-amber-800 font-bold mb-3">🏅 我的证书收藏</p>
          <div className="flex gap-3 flex-wrap">
            {certs.map((c) => (
              <button
                key={c.id}
                onClick={() => setSelectedChallenge(c.challengeId)}
                className={`p-3 rounded-xl bg-white border text-left transition-all hover:-translate-y-0.5 ${
                  selectedChallenge === c.challengeId
                    ? 'border-amber-500 shadow-md shadow-amber-200'
                    : 'border-amber-200 hover:border-amber-400'
                }`}
              >
                <p className="text-xs text-amber-700 mb-0.5">{c.achievement}</p>
                <p className="text-sm font-bold text-neutral-800 max-w-[180px] truncate">
                  {c.challengeName}
                </p>
                <p className="text-xs text-neutral-500 mt-1">{c.completionRate}% 完成率</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {loading && (
        <div className="p-16 bg-white rounded-3xl border border-neutral-100 text-center text-neutral-500">
          正在生成证书...
        </div>
      )}

      {!loading && error && (
        <div className="p-10 bg-white rounded-3xl border border-neutral-100 text-center">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-neutral-100 flex items-center justify-center mb-4">
            <Award size={28} className="text-neutral-400" />
          </div>
          <h3 className="font-bold text-lg text-neutral-700 mb-2">暂无法生成证书</h3>
          <p className="text-sm text-neutral-500 mb-4">{error}</p>
          <p className="text-xs text-neutral-400">
            挑战结束后或完成率达到 50% 以上即可解锁专属成就证书
          </p>
        </div>
      )}

      {!loading && !error && currentCert && (
        <>
          <div className="flex items-center justify-end gap-3">
            <button
              onClick={exportPng}
              disabled={!!exporting}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 text-white font-bold text-sm hover:shadow-lg hover:shadow-orange-200 transition-all disabled:opacity-60"
            >
              <FileImage size={16} />
              {exporting === 'png' ? '导出中...' : '导出 PNG'}
            </button>
            <button
              onClick={exportPdf}
              disabled={!!exporting}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-secondary-500 to-teal-500 text-white font-bold text-sm hover:shadow-lg hover:shadow-secondary-200 transition-all disabled:opacity-60"
            >
              <FileText size={16} />
              {exporting === 'pdf' ? '导出中...' : '导出 PDF'}
            </button>
          </div>

          <div className="flex justify-center p-6 bg-gradient-to-br from-neutral-100 to-neutral-200 rounded-3xl overflow-auto">
            <div ref={certRef} className="shadow-2xl">
              <CertificateView cert={currentCert} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
