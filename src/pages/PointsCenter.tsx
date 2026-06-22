import { useEffect, useState } from 'react';
import { Coins, TrendingUp, History, Trophy, Flame, Star, Gift, RefreshCw } from 'lucide-react';
import api from '@/lib/api';
import useAuthStore from '@/store/auth';
import usePointsStore from '@/store/points';
import type { PointsRecord } from '@shared/types';
import StatCard from '@/components/ui/StatCard';

const actionTypeLabels: Record<string, string> = {
  checkin: '签到',
  consecutive_checkin: '连续签到奖励',
  post_dynamic: '发布动态',
  invite_friend: '邀请好友',
  bonus: '额外奖励',
  exchange: '兑换商品',
};

const actionTypeColors: Record<string, string> = {
  checkin: 'bg-green-100 text-green-700',
  consecutive_checkin: 'bg-blue-100 text-blue-700',
  post_dynamic: 'bg-purple-100 text-purple-700',
  invite_friend: 'bg-orange-100 text-orange-700',
  bonus: 'bg-yellow-100 text-yellow-700',
  exchange: 'bg-red-100 text-red-700',
};

export default function PointsCenterPage() {
  const { user } = useAuthStore();
  const {
    userPoints,
    pointsRecords: storeRecords,
    loading: storeLoading,
    refreshUserPoints,
    refreshRecords,
  } = usePointsStore();
  const [ranking, setRanking] = useState<
    { memberId: string; memberName: string; avatar?: string; totalPoints: number; currentPoints: number; consecutiveDays: number; rank: number }[]
  >([]);
  const [rankingLoading, setRankingLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'records' | 'ranking'>('overview');

  useEffect(() => {
    if (!user) return;
    refreshUserPoints(user.id);
    refreshRecords(user.id);
  }, [user, refreshUserPoints, refreshRecords]);

  useEffect(() => {
    if (!user) return;
    if (activeTab === 'ranking') {
      setRankingLoading(true);
      api.points.getRanking(10).then((res) => {
        if (res.success && res.data) {
          setRanking(res.data);
        }
        setRankingLoading(false);
      });
    }
  }, [user, activeTab]);

  const handleRefresh = () => {
    if (!user) return;
    refreshUserPoints(user.id, true);
    refreshRecords(user.id, true);
    if (activeTab === 'ranking') {
      setRankingLoading(true);
      api.points.getRanking(10).then((res) => {
        if (res.success && res.data) setRanking(res.data);
        setRankingLoading(false);
      });
    }
  };

  if (!user) return null;

  const loading = storeLoading.points || storeLoading.records;

  if (loading && !userPoints) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-800">积分中心</h1>
          <p className="text-neutral-500 mt-1">通过参与活动获取积分，兑换精彩好礼</p>
        </div>
        <button
          onClick={handleRefresh}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-neutral-200 text-neutral-600 hover:bg-neutral-50 transition-all text-sm font-medium"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          刷新数据
        </button>
      </div>

      {userPoints && (
        <div className="bg-gradient-to-br from-primary-500 to-secondary-500 rounded-2xl p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-primary-100 text-sm">当前积分</p>
              <div className="flex items-end gap-2 mt-1">
                <span className="text-4xl font-bold">{userPoints.currentPoints}</span>
                <span className="text-primary-100 mb-1">分</span>
              </div>
              <p className="text-primary-100 text-sm mt-2">累计获得: {userPoints.totalPoints} 分</p>
            </div>
            <div className="text-right">
              <div className="flex items-center gap-2 bg-white/20 rounded-xl px-4 py-2">
                <Flame size={20} className="text-orange-300" />
                <div>
                  <p className="text-sm text-primary-100">连续签到</p>
                  <p className="text-xl font-bold">{userPoints.consecutiveDays} 天</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          title="签到规则"
          value="+10"
          icon={Star}
          subtitle="每日签到获得积分"
          variant="teal"
        />
        <StatCard
          title="连续奖励"
          value="+5/天"
          icon={Flame}
          subtitle="连续签到额外奖励"
          variant="orange"
        />
        <StatCard
          title="邀请好友"
          value="+100"
          icon={Gift}
          subtitle="成功邀请好友注册"
          variant="purple"
        />
      </div>

      <div className="bg-white rounded-2xl border border-neutral-200 overflow-hidden">
        <div className="flex border-b border-neutral-200">
          <button
            onClick={() => setActiveTab('overview')}
            className={`flex-1 px-6 py-4 text-sm font-medium transition-colors ${
              activeTab === 'overview'
                ? 'text-primary-600 border-b-2 border-primary-500'
                : 'text-neutral-500 hover:text-neutral-700'
            }`}
          >
            <TrendingUp size={16} className="inline mr-2" />
            获取方式
          </button>
          <button
            onClick={() => setActiveTab('records')}
            className={`flex-1 px-6 py-4 text-sm font-medium transition-colors ${
              activeTab === 'records'
                ? 'text-primary-600 border-b-2 border-primary-500'
                : 'text-neutral-500 hover:text-neutral-700'
            }`}
          >
            <History size={16} className="inline mr-2" />
            积分明细
          </button>
          <button
            onClick={() => setActiveTab('ranking')}
            className={`flex-1 px-6 py-4 text-sm font-medium transition-colors ${
              activeTab === 'ranking'
                ? 'text-primary-600 border-b-2 border-primary-500'
                : 'text-neutral-500 hover:text-neutral-700'
            }`}
          >
            <Trophy size={16} className="inline mr-2" />
            积分排行
          </button>
        </div>

        <div className="p-6">
          {activeTab === 'overview' && (
            <div className="space-y-4">
              <div className="bg-gradient-to-r from-green-50 to-green-100 rounded-xl p-4 border border-green-200">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center">
                    <Coins size={20} className="text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-medium text-green-800">每日签到</h3>
                    <p className="text-sm text-green-600">每天签到获得 10 积分，补卡获得 5 积分</p>
                  </div>
                  <span className="text-green-700 font-bold">+10</span>
                </div>
              </div>

              <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-xl p-4 border border-blue-200">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center">
                    <Flame size={20} className="text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-medium text-blue-800">连续签到奖励</h3>
                    <p className="text-sm text-blue-600">连续签到每增加1天，额外获得 5 积分</p>
                  </div>
                  <span className="text-blue-700 font-bold">+5/天</span>
                </div>
              </div>

              <div className="bg-gradient-to-r from-purple-50 to-purple-100 rounded-xl p-4 border border-purple-200">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-purple-500 flex items-center justify-center">
                    <Star size={20} className="text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-medium text-purple-800">发布动态</h3>
                    <p className="text-sm text-purple-600">每次发布运动动态获得 15 积分（每日上限3次）</p>
                  </div>
                  <span className="text-purple-700 font-bold">+15</span>
                </div>
              </div>

              <div className="bg-gradient-to-r from-orange-50 to-orange-100 rounded-xl p-4 border border-orange-200">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-orange-500 flex items-center justify-center">
                    <Gift size={20} className="text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-medium text-orange-800">邀请好友</h3>
                    <p className="text-sm text-orange-600">成功邀请好友注册并加入平台，获得 100 积分</p>
                  </div>
                  <span className="text-orange-700 font-bold">+100</span>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'records' && (
            <div className="space-y-3">
              {storeLoading.records && storeRecords.length === 0 ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full" />
                </div>
              ) : storeRecords.length === 0 ? (
                <div className="text-center py-12 text-neutral-500">
                  <History size={48} className="mx-auto mb-4 opacity-50" />
                  <p>暂无积分记录</p>
                </div>
              ) : (
                storeRecords.map((record: PointsRecord) => (
                  <div
                    key={record.id}
                    className="flex items-center justify-between p-4 bg-neutral-50 rounded-xl hover:bg-neutral-100 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium ${actionTypeColors[record.actionType] || 'bg-neutral-100 text-neutral-700'}`}
                      >
                        {actionTypeLabels[record.actionType] || record.actionType}
                      </span>
                      <div>
                        <p className="font-medium text-neutral-800">{record.description}</p>
                        <p className="text-xs text-neutral-500">
                          {new Date(record.createdAt).toLocaleString('zh-CN')}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`font-bold text-lg ${
                        record.points >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}
                    >
                      {record.points >= 0 ? '+' : ''}
                      {record.points}
                    </span>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'ranking' && (
            <div className="space-y-3">
              {rankingLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full" />
                </div>
              ) : (
                ranking.map((item, index) => (
                  <div
                    key={item.memberId}
                    className={`flex items-center justify-between p-4 rounded-xl transition-colors ${
                      item.memberId === user.id
                        ? 'bg-primary-50 border border-primary-200'
                        : 'bg-neutral-50 hover:bg-neutral-100'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                          index === 0
                            ? 'bg-yellow-400 text-white'
                            : index === 1
                            ? 'bg-neutral-300 text-white'
                            : index === 2
                            ? 'bg-amber-600 text-white'
                            : 'bg-neutral-200 text-neutral-600'
                        }`}
                      >
                        {index < 3 ? <Trophy size={16} /> : item.rank}
                      </div>
                      <img
                        src={item.avatar}
                        alt={item.memberName}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                      <div>
                        <p className="font-medium text-neutral-800">
                          {item.memberName}
                          {item.memberId === user.id && (
                            <span className="ml-2 text-xs text-primary-600">(我)</span>
                          )}
                        </p>
                        <p className="text-xs text-neutral-500">连续签到 {item.consecutiveDays} 天</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-lg text-primary-600">{item.totalPoints}</p>
                      <p className="text-xs text-neutral-500">总积分</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
