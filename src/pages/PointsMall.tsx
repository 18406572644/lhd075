import { useEffect, useState } from 'react';
import { ShoppingBag, Coins, Badge, CreditCard, Ticket, Package, Check, RefreshCw } from 'lucide-react';
import api from '@/lib/api';
import useAuthStore from '@/store/auth';
import usePointsStore from '@/store/points';
import type { MallItem, UserMallItem, MallItemType } from '@shared/types';

const typeIcons: Record<MallItemType, React.ElementType> = {
  badge: Badge,
  certificate_skin: CreditCard,
  coupon: Ticket,
};

const typeLabels: Record<MallItemType, string> = {
  badge: '虚拟徽章',
  certificate_skin: '证书皮肤',
  coupon: '优惠券',
};

const typeColors: Record<MallItemType, string> = {
  badge: 'from-yellow-400 to-orange-500',
  certificate_skin: 'from-blue-400 to-purple-500',
  coupon: 'from-green-400 to-emerald-500',
};

export default function PointsMallPage() {
  const { user } = useAuthStore();
  const {
    userPoints,
    mallItems,
    userMallItems,
    loading: storeLoading,
    refreshUserPoints,
    refreshMallItems,
    refreshUserMallItems,
  } = usePointsStore();
  const [activeTab, setActiveTab] = useState<'mall' | 'my'>('mall');
  const [filterType, setFilterType] = useState<MallItemType | 'all'>('all');
  const [exchanging, setExchanging] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (!user) return;
    refreshUserPoints(user.id);
    refreshMallItems();
    refreshUserMallItems(user.id);
  }, [user, refreshUserPoints, refreshMallItems, refreshUserMallItems]);

  const handleRefresh = () => {
    if (!user) return;
    refreshUserPoints(user.id, true);
    refreshMallItems({}, true);
    refreshUserMallItems(user.id, true);
  };

  const handleExchange = async (item: MallItem) => {
    if (!user || !userPoints) return;
    if (userPoints.currentPoints < item.pointsCost) {
      setMessage({ type: 'error', text: '积分不足，无法兑换' });
      setTimeout(() => setMessage(null), 3000);
      return;
    }

    setExchanging(item.id);
    try {
      const result = await api.mall.exchange(item.id, user.id);
      if (result.success && result.data) {
        usePointsStore.getState().invalidateCache();
        await Promise.all([
          refreshUserPoints(user.id, true),
          refreshMallItems({}, true),
          refreshUserMallItems(user.id, true),
        ]);
        setMessage({ type: 'success', text: `成功兑换 ${item.name}！` });
      } else {
        setMessage({ type: 'error', text: result.error?.message || '兑换失败' });
      }
    } catch {
      setMessage({ type: 'error', text: '兑换失败，请稍后重试' });
    } finally {
      setExchanging(null);
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const handleUseItem = async (userItemId: string) => {
    if (!user) return;
    try {
      const result = await api.mall.useItem(userItemId, user.id);
      if (result.success && result.data) {
        refreshUserMallItems(user.id, true);
        setMessage({ type: 'success', text: '已成功使用！' });
      }
    } catch {
      setMessage({ type: 'error', text: '使用失败，请稍后重试' });
    }
    setTimeout(() => setMessage(null), 3000);
  };

  const filteredItems =
    filterType === 'all'
      ? mallItems
      : mallItems.filter((i) => i.type === filterType);

  if (!user) return null;

  const loading = storeLoading.points || storeLoading.mall || storeLoading.userItems;

  if (loading && (!mallItems.length || !userPoints)) {
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
          <h1 className="text-2xl font-bold text-neutral-800">积分商城</h1>
          <p className="text-neutral-500 mt-1">用您的积分兑换精彩好礼</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleRefresh}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-neutral-200 text-neutral-600 hover:bg-neutral-50 transition-all text-sm font-medium"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            刷新
          </button>
          {userPoints && (
            <div className="flex items-center gap-2 bg-gradient-to-r from-primary-500 to-secondary-500 text-white px-4 py-2 rounded-full">
              <Coins size={20} />
              <span className="font-bold">{userPoints.currentPoints}</span>
              <span className="text-primary-100">积分</span>
            </div>
          )}
        </div>
      </div>

      {message && (
        <div
          className={`p-4 rounded-xl flex items-center gap-3 animate-fade-in ${
            message.type === 'success'
              ? 'bg-green-50 border border-green-200 text-green-700'
              : 'bg-red-50 border border-red-200 text-red-700'
          }`}
        >
          {message.type === 'success' ? <Check size={20} /> : <Coins size={20} />}
          <span>{message.text}</span>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-neutral-200 overflow-hidden">
        <div className="flex border-b border-neutral-200">
          <button
            onClick={() => setActiveTab('mall')}
            className={`flex-1 px-6 py-4 text-sm font-medium transition-colors ${
              activeTab === 'mall'
                ? 'text-primary-600 border-b-2 border-primary-500'
                : 'text-neutral-500 hover:text-neutral-700'
            }`}
          >
            <ShoppingBag size={16} className="inline mr-2" />
            商城
          </button>
          <button
            onClick={() => setActiveTab('my')}
            className={`flex-1 px-6 py-4 text-sm font-medium transition-colors ${
              activeTab === 'my'
                ? 'text-primary-600 border-b-2 border-primary-500'
                : 'text-neutral-500 hover:text-neutral-700'
            }`}
          >
            <Package size={16} className="inline mr-2" />
            我的物品
            {userMallItems.length > 0 && (
              <span className="ml-2 px-2 py-0.5 bg-primary-100 text-primary-700 text-xs rounded-full">
                {userMallItems.length}
              </span>
            )}
          </button>
        </div>

        <div className="p-6">
          {activeTab === 'mall' && (
            <>
              <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
                <button
                  onClick={() => setFilterType('all')}
                  className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                    filterType === 'all'
                      ? 'bg-primary-500 text-white'
                      : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                  }`}
                >
                  全部
                </button>
                {(['badge', 'certificate_skin', 'coupon'] as MallItemType[]).map((type) => (
                  <button
                    key={type}
                    onClick={() => setFilterType(type)}
                    className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                      filterType === type
                        ? 'bg-primary-500 text-white'
                        : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                    }`}
                  >
                    {typeLabels[type]}
                  </button>
                ))}
              </div>

              {storeLoading.mall && filteredItems.length === 0 ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full" />
                </div>
              ) : filteredItems.length === 0 ? (
                <div className="text-center py-12 text-neutral-500">
                  <ShoppingBag size={48} className="mx-auto mb-4 opacity-50" />
                  <p>暂无商品</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredItems.map((item) => {
                    const Icon = typeIcons[item.type];
                    const canAfford =
                      userPoints && userPoints.currentPoints >= item.pointsCost;
                    const outOfStock = item.stock <= 0;

                    return (
                      <div
                        key={item.id}
                        className="border border-neutral-200 rounded-xl overflow-hidden hover:shadow-lg transition-all group"
                      >
                        <div
                          className={`h-32 bg-gradient-to-br ${typeColors[item.type]} flex items-center justify-center relative`}
                        >
                          <Icon size={48} className="text-white opacity-90" />
                          {item.stock < 10 && item.stock > 0 && (
                            <span className="absolute top-2 right-2 bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                              仅剩 {item.stock} 件
                            </span>
                          )}
                          {outOfStock && (
                            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                              <span className="text-white font-bold">已售罄</span>
                            </div>
                          )}
                        </div>
                        <div className="p-4">
                          <div className="flex items-start justify-between mb-2">
                            <h3 className="font-bold text-neutral-800">{item.name}</h3>
                            <span className="text-xs text-neutral-500 bg-neutral-100 px-2 py-1 rounded-full">
                              {typeLabels[item.type]}
                            </span>
                          </div>
                          <p className="text-sm text-neutral-500 mb-4 line-clamp-2">
                            {item.description}
                          </p>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1">
                              <Coins size={16} className="text-primary-500" />
                              <span className="font-bold text-primary-600 text-lg">
                                {item.pointsCost}
                              </span>
                            </div>
                            <button
                              onClick={() => handleExchange(item)}
                              disabled={!canAfford || outOfStock || exchanging === item.id}
                              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                                canAfford && !outOfStock
                                  ? 'bg-primary-500 text-white hover:bg-primary-600'
                                  : 'bg-neutral-200 text-neutral-500 cursor-not-allowed'
                              }`}
                            >
                              {exchanging === item.id ? (
                                <span className="flex items-center gap-2">
                                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                  兑换中
                                </span>
                              ) : outOfStock ? (
                                '已售罄'
                              ) : !canAfford ? (
                                '积分不足'
                              ) : (
                                '立即兑换'
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {activeTab === 'my' && (
            <div className="space-y-4">
              {storeLoading.userItems && userMallItems.length === 0 ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full" />
                </div>
              ) : userMallItems.length === 0 ? (
                <div className="text-center py-12 text-neutral-500">
                  <Package size={48} className="mx-auto mb-4 opacity-50" />
                  <p>您还没有兑换任何物品</p>
                  <p className="text-sm mt-2">去商城看看有什么好东西吧！</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {userMallItems.map((item: UserMallItem) => {
                    const Icon = typeIcons[item.type];
                    return (
                      <div
                        key={item.id}
                        className={`border rounded-xl overflow-hidden transition-all ${
                          item.used
                            ? 'border-neutral-200 opacity-60'
                            : 'border-neutral-200 hover:shadow-lg'
                        }`}
                      >
                        <div
                          className={`h-24 bg-gradient-to-br ${typeColors[item.type]} flex items-center justify-center relative`}
                        >
                          <Icon size={36} className="text-white opacity-90" />
                          {item.used && (
                            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                              <span className="text-white font-bold flex items-center gap-1">
                                <Check size={16} />
                                已使用
                              </span>
                            </div>
                          )}
                        </div>
                        <div className="p-4">
                          <div className="flex items-start justify-between mb-2">
                            <h3 className="font-bold text-neutral-800">{item.name}</h3>
                            <span className="text-xs text-neutral-500 bg-neutral-100 px-2 py-1 rounded-full">
                              {typeLabels[item.type]}
                            </span>
                          </div>
                          <p className="text-xs text-neutral-500 mb-3">
                            兑换于: {new Date(item.purchasedAt).toLocaleDateString('zh-CN')}
                          </p>
                          {!item.used && (
                            <button
                              onClick={() => handleUseItem(item.id)}
                              className="w-full py-2 bg-secondary-500 text-white rounded-lg text-sm font-medium hover:bg-secondary-600 transition-colors"
                            >
                              立即使用
                            </button>
                          )}
                          {item.usedAt && (
                            <p className="text-xs text-neutral-400 text-center">
                              使用于: {new Date(item.usedAt).toLocaleDateString('zh-CN')}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
