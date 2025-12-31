import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Mountain, Users, Calendar, MapPin, Star, Search, Menu, X, 
  ChevronRight, Filter, Plus, Edit, Trash2, Check, AlertCircle,
  UserPlus, MapPinned, TrendingUp, FileText
} from 'lucide-react';
import './App.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

// API Service
const api = {
  setToken: (token) => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      localStorage.setItem('token', token);
    } else {
      delete axios.defaults.headers.common['Authorization'];
      localStorage.removeItem('token');
    }
  },
  
  auth: {
    login: (email, password) => axios.post(`${API_URL}/auth/login`, { email, password }),
    register: (data) => axios.post(`${API_URL}/auth/register`, data),
    getMe: () => axios.get(`${API_URL}/auth/me`),
  },
  
  locations: {
    getAll: () => axios.get(`${API_URL}/locations`),
    create: (data) => axios.post(`${API_URL}/locations`, data),
    update: (id, data) => axios.put(`${API_URL}/locations/${id}`, data),
  },
  
  trails: {
    getAll: (locationId) => axios.get(`${API_URL}/trails`, { params: { locationId } }),
    create: (data) => axios.post(`${API_URL}/trails`, data),
  },
  
  trips: {
    getAll: (params) => axios.get(`${API_URL}/trips`, { params }),
    getOne: (id) => axios.get(`${API_URL}/trips/${id}`),
    create: (data) => axios.post(`${API_URL}/trips`, data),
    update: (id, data) => axios.put(`${API_URL}/trips/${id}`, data),
    delete: (id) => axios.delete(`${API_URL}/trips/${id}`),
    getParticipants: (id) => axios.get(`${API_URL}/trips/${id}/participants`),
    join: (id, data) => axios.post(`${API_URL}/trips/${id}/join`, data),
  },
  
  participations: {
    update: (id, status) => axios.put(`${API_URL}/participations/${id}`, { status }),
    delete: (id) => axios.delete(`${API_URL}/participations/${id}`),
  },
  
  porters: {
    getAll: (locationId) => axios.get(`${API_URL}/porters`, { params: { locationId } }),
    getOne: (id) => axios.get(`${API_URL}/porters/${id}`),
  },
  
  ratings: {
    getAll: (params) => axios.get(`${API_URL}/ratings`, { params }),
    create: (data) => axios.post(`${API_URL}/ratings`, data),
  },
  
  reports: {
    getAll: () => axios.get(`${API_URL}/reports`),
    create: (data) => axios.post(`${API_URL}/reports`, data),
    update: (id, status) => axios.put(`${API_URL}/reports/${id}`, { status }),
  },
  
  stats: {
    getOverview: () => axios.get(`${API_URL}/stats/overview`),
  },
};

function App() {
  const [currentView, setCurrentView] = useState('landing');
  const [selectedTripId, setSelectedTripId] = useState(null);
  const [user, setUser] = useState(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [notification, setNotification] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      api.setToken(token);
      api.auth.getMe()
        .then(res => setUser(res.data))
        .catch(() => api.setToken(null));
    }
  }, []);

  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const handleLogout = () => {
    api.setToken(null);
    setUser(null);
    setCurrentView('landing');
  };

  // Header Component
  const Header = () => (
    <header className="header">
      <div className="container">
        <div className="header-content">
          <div className="logo" onClick={() => setCurrentView('landing')}>
            <Mountain className="logo-icon" />
            <span className="logo-text">TrekConnect</span>
          </div>
          
          <nav className="nav-desktop">
            <a onClick={() => setCurrentView('landing')}>Trang chủ</a>
            <a onClick={() => setCurrentView('trips')}>Chuyến đi</a>
            {user && user.role === 'Admin' && (
              <>
                <a onClick={() => setCurrentView('admin-trips')}>Quản lý chuyến đi</a>
                <a onClick={() => setCurrentView('admin-locations')}>Địa điểm</a>
                <a onClick={() => setCurrentView('admin-dashboard')}>Dashboard</a>
              </>
            )}
            {user ? (
              <div className="user-menu">
                <span className="user-name">Xin chào, {user.name}</span>
                {(user.is_leader || user.role === 'Admin') && (
                  <button 
                    className="btn btn-primary"
                    onClick={() => setCurrentView('create-trip')}>
                    Tạo chuyến đi
                  </button>
                )}
                <button className="btn btn-secondary" onClick={handleLogout}>
                  Đăng xuất
                </button>
              </div>
            ) : (
              <div className="auth-buttons">
                <button onClick={() => setCurrentView('login')}>Đăng nhập</button>
                <button className="btn btn-primary" onClick={() => setCurrentView('register')}>
                  Đăng ký
                </button>
              </div>
            )}
          </nav>

          <button className="menu-toggle" onClick={() => setIsMenuOpen(!isMenuOpen)}>
            {isMenuOpen ? <X /> : <Menu />}
          </button>
        </div>
      </div>
      
      {isMenuOpen && (
        <div className="mobile-menu">
          <a onClick={() => { setCurrentView('landing'); setIsMenuOpen(false); }}>Trang chủ</a>
          <a onClick={() => { setCurrentView('trips'); setIsMenuOpen(false); }}>Chuyến đi</a>
          {user ? (
            <>
              {user.role === 'Admin' && (
                <>
                  <a onClick={() => { setCurrentView('admin-trips'); setIsMenuOpen(false); }}>Quản lý chuyến đi</a>
                  <a onClick={() => { setCurrentView('admin-locations'); setIsMenuOpen(false); }}>Địa điểm</a>
                  <a onClick={() => { setCurrentView('admin-dashboard'); setIsMenuOpen(false); }}>Dashboard</a>
                </>
              )}
              <button onClick={handleLogout}>Đăng xuất</button>
            </>
          ) : (
            <>
              <a onClick={() => { setCurrentView('login'); setIsMenuOpen(false); }}>Đăng nhập</a>
              <a onClick={() => { setCurrentView('register'); setIsMenuOpen(false); }}>Đăng ký</a>
            </>
          )}
        </div>
      )}
    </header>
  );

  // Landing Page
  const LandingPage = () => (
    <div className="landing">
      <section className="hero">
        <div className="hero-overlay"></div>
        <div className="hero-content">
          <h1 className="hero-title">
            Tham gia, Tổ chức và<br />Khám phá - Cùng nhau
          </h1>
          <p className="hero-subtitle">
            Nền tảng dành riêng cho cộng đồng đam mê trekking - nơi kết nối,
            lập kế hoạch và bắt đầu những hành trình đáng nhớ.
          </p>
          <div className="hero-actions">
            <button className="btn btn-primary btn-large" onClick={() => setCurrentView('trips')}>
              Bắt đầu hành trình
            </button>
            <button className="btn btn-secondary btn-large">
              Xem giới thiệu
            </button>
          </div>
        </div>
      </section>

      <section className="features">
        <div className="container">
          <h2 className="section-title">Cách hoạt động</h2>
          <p className="section-subtitle">Ba bước đơn giản để bắt đầu hành trình tiếp theo của bạn</p>
          
          <div className="features-grid">
            {[
              {
                icon: Search,
                title: "Tạo hoặc tìm chuyến đi",
                description: "Lựa chọn địa điểm, cung đường theo giá và thời gian. Hoặc tự tổ chức chuyến riêng.",
                step: "1"
              },
              {
                icon: Users,
                title: "Kết nối với Porter & Trekker",
                description: "Kết nối với porter và những người cùng đam mê leo núi.",
                step: "2"
              },
              {
                icon: Mountain,
                title: "An toàn & Lưu trữ hành trình",
                description: "Quản lý chuyến đi an toàn và chia sẻ những hành trình đã chinh phục.",
                step: "3"
              }
            ].map((feature, index) => (
              <div key={index} className="feature-card">
                <div className="feature-step">{feature.step}</div>
                <feature.icon className="feature-icon" />
                <h3>{feature.title}</h3>
                <p>{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );

  // Login Page
  const LoginPage = () => {
    const [formData, setFormData] = useState({ email: '', password: '' });
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
      e.preventDefault();
      try {
        const res = await api.auth.login(formData.email, formData.password);
        api.setToken(res.data.token);
        setUser(res.data.user);
        showNotification('Đăng nhập thành công!');
        setCurrentView('trips');
      } catch (err) {
        setError(err.response?.data?.error || 'Đăng nhập thất bại');
      }
    };

    return (
      <div className="auth-page">
        <div className="auth-card">
          <div className="auth-icon">
            <Mountain size={40} />
          </div>
          <h2>Welcome Back</h2>
          <p className="auth-subtitle">Join our trekking community</p>
          
          {error && <div className="error-message">{error}</div>}
          
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Email</label>
              <input
                type="email"
                placeholder="Nhập email của bạn"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                required
              />
            </div>
            
            <div className="form-group">
              <label>Mật khẩu</label>
              <input
                type="password"
                placeholder="Nhập mật khẩu"
                value={formData.password}
                onChange={(e) => setFormData({...formData, password: e.target.value})}
                required
              />
            </div>
            
            <button type="submit" className="btn btn-primary btn-block">
              Đăng nhập
            </button>
          </form>
          
          <p className="auth-footer">
            Chưa có tài khoản?{' '}
            <a onClick={() => setCurrentView('register')}>Đăng ký ngay</a>
          </p>
        </div>
      </div>
    );
  };

  // Register Page
  const RegisterPage = () => {
    const [formData, setFormData] = useState({
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
      isPorter: false,
      bio: '',
      contactInfo: ''
    });
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
      e.preventDefault();
      if (formData.password !== formData.confirmPassword) {
        setError('Mật khẩu không khớp');
        return;
      }
      
      try {
        await api.auth.register(formData);
        showNotification('Đăng ký thành công! Vui lòng đăng nhập.');
        setCurrentView('login');
      } catch (err) {
        setError(err.response?.data?.error || 'Đăng ký thất bại');
      }
    };

    return (
      <div className="auth-page">
        <div className="auth-card">
          <div className="auth-icon">
            <Mountain size={40} />
          </div>
          <h2>Tham gia ngay</h2>
          <p className="auth-subtitle">Bắt đầu hành trình của bạn</p>
          
          {error && <div className="error-message">{error}</div>}
          
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={formData.isPorter}
                  onChange={(e) => setFormData({...formData, isPorter: e.target.checked})}
                />
                Đăng ký làm Porter
              </label>
            </div>

            <div className="form-group">
              <label>Họ và Tên</label>
              <input
                type="text"
                placeholder="Nhập tên của bạn"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                required
              />
            </div>
            
            <div className="form-group">
              <label>Email</label>
              <input
                type="email"
                placeholder="Nhập email của bạn"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                required
              />
            </div>
            
            <div className="form-group">
              <label>Mật khẩu</label>
              <input
                type="password"
                placeholder="Nhập mật khẩu"
                value={formData.password}
                onChange={(e) => setFormData({...formData, password: e.target.value})}
                required
              />
            </div>
            
            <div className="form-group">
              <label>Xác nhận mật khẩu</label>
              <input
                type="password"
                placeholder="Nhập lại mật khẩu"
                value={formData.confirmPassword}
                onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
                required
              />
            </div>

            {formData.isPorter && (
              <>
                <div className="form-group">
                  <label>Tiểu sử</label>
                  <textarea
                    placeholder="Giới thiệu về bạn"
                    value={formData.bio}
                    onChange={(e) => setFormData({...formData, bio: e.target.value})}
                  />
                </div>
                <div className="form-group">
                  <label>Thông tin liên hệ</label>
                  <input
                    type="text"
                    placeholder="Số điện thoại"
                    value={formData.contactInfo}
                    onChange={(e) => setFormData({...formData, contactInfo: e.target.value})}
                  />
                </div>
              </>
            )}
            
            <button type="submit" className="btn btn-primary btn-block">
              Đăng ký
            </button>
          </form>
          
          <p className="auth-footer">
            Đã có tài khoản?{' '}
            <a onClick={() => setCurrentView('login')}>Đăng nhập</a>
          </p>
        </div>
      </div>
    );
  };

  // Trips Page
  const TripsPage = () => {
    const [trips, setTrips] = useState([]);
    const [locations, setLocations] = useState([]);
    const [filters, setFilters] = useState({
      locationId: '',
      difficulty: '',
      search: ''
    });

    useEffect(() => {
      loadTrips();
      loadLocations();
    }, []);

    const loadTrips = async () => {
      try {
        const res = await api.trips.getAll(filters);
        setTrips(res.data);
      } catch (err) {
        console.error('Error loading trips:', err);
      }
    };

    const loadLocations = async () => {
      try {
        const res = await api.locations.getAll();
        setLocations(res.data);
      } catch (err) {
        console.error('Error loading locations:', err);
      }
    };

    const handleSearch = () => {
      loadTrips();
    };

    const handleJoinTrip = async (tripId) => {
      if (!user) {
        showNotification('Vui lòng đăng nhập để tham gia chuyến đi', 'error');
        setCurrentView('login');
        return;
      }

      try {
        await api.trips.join(tripId, { role: 'User' });
        showNotification('Đã gửi yêu cầu tham gia!');
        loadTrips();
      } catch (err) {
        showNotification(err.response?.data?.error || 'Không thể tham gia chuyến đi', 'error');
      }
    };

    const difficultyColors = {
      "Nhập môn": "badge-green",
      "Cơ bản": "badge-blue",
      "Nâng cao": "badge-orange",
      "Thách thức": "badge-red",
      "Cực khó": "badge-purple"
    };

    return (
      <div className="trips-page">
        <div className="trips-banner">
          <h1>Tham gia, Tổ chức và Khám phá</h1>
          <p>Nền tảng dành riêng cho cộng đồng đam mê trekking</p>
        </div>

        <div className="container">
          <div className="search-box">
            <div className="search-input-group">
              <Search className="search-icon" />
              <input
                type="text"
                placeholder="Bạn muốn đi đâu?"
                value={filters.search}
                onChange={(e) => setFilters({...filters, search: e.target.value})}
              />
            </div>
            <button className="btn btn-primary" onClick={handleSearch}>
              Tìm kiếm
            </button>
          </div>

          <div className="trips-content">
            <aside className="trips-sidebar">
              <div className="filter-section">
                <h3><Filter size={20} /> Lọc theo</h3>
                
                <div className="filter-group">
                  <label>Địa điểm</label>
                  <select
                    value={filters.locationId}
                    onChange={(e) => setFilters({...filters, locationId: e.target.value})}>
                    <option value="">Tất cả</option>
                    {locations.map(loc => (
                      <option key={loc.location_id} value={loc.location_id}>
                        {loc.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="filter-group">
                  <label>Độ khó</label>
                  <select
                    value={filters.difficulty}
                    onChange={(e) => setFilters({...filters, difficulty: e.target.value})}>
                    <option value="">Tất cả</option>
                    <option value="Nhập môn">Nhập môn</option>
                    <option value="Cơ bản">Cơ bản</option>
                    <option value="Nâng cao">Nâng cao</option>
                    <option value="Thách thức">Thách thức</option>
                    <option value="Cực khó">Cực khó</option>
                  </select>
                </div>

                <button className="btn btn-primary btn-block" onClick={handleSearch}>
                  Áp dụng bộ lọc
                </button>
              </div>

              {user && user.is_leader && (
                <button 
                  className="btn btn-secondary btn-block"
                  onClick={() => setCurrentView('create-trip')}>
                  <Plus size={20} /> Tạo chuyến đi mới
                </button>
              )}
            </aside>

            <div className="trips-list">
              <div className="trips-header">
                <h2>Các chuyến đi đang được tổ chức</h2>
                <p>{trips.length} kết quả</p>
              </div>

              {trips.length === 0 ? (
                <div className="empty-state">
                  <Mountain size={64} />
                  <p>Không tìm thấy chuyến đi nào</p>
                </div>
              ) : (
                <div className="trips-grid">
                  {trips.map(trip => (
                    <div key={trip.trip_id} className="trip-card">
                      <div className="trip-card-header">
                        <span className={`badge ${difficultyColors[trip.difficulty]}`}>
                          {trip.difficulty}
                        </span>
                      </div>
                      
                      <h3 
                        onClick={() => {
                          setSelectedTripId(trip.trip_id);
                          setCurrentView('trip-detail');
                        }}
                        style={{ cursor: 'pointer' }}>
                        {trip.title}
                      </h3>
                      
                      <div className="trip-meta">
                        <span><MapPin size={16} /> {trip.location_name}</span>
                        <span><Calendar size={16} /> {new Date(trip.start_date).toLocaleDateString('vi-VN')}</span>
                      </div>

                      <p className="trip-description">{trip.description}</p>

                      <div className="trip-stats">
                        <div>
                          <label>Giá ước tính</label>
                          <strong>{trip.estimated_cost?.toLocaleString()}đ</strong>
                        </div>
                        <div>
                          <label>Số lượng</label>
                          <strong>{trip.confirmed_participants}/{trip.max_participants}</strong>
                        </div>
                      </div>

                      <div className="trip-footer">
                        <button 
                          className="btn btn-secondary btn-block"
                          onClick={() => {
                            setSelectedTripId(trip.trip_id);
                            setCurrentView('trip-detail');
                          }}
                          style={{ marginBottom: '0.5rem' }}>
                          Xem chi tiết
                        </button>
                        <button 
                          className="btn btn-primary btn-block"
                          onClick={() => handleJoinTrip(trip.trip_id)}
                          disabled={trip.confirmed_participants >= trip.max_participants}>
                          {trip.confirmed_participants >= trip.max_participants ? 'Đã đủ người' : 'Tham gia ngay'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Create Trip Page
  const CreateTripPage = () => {
    const [locations, setLocations] = useState([]);
    const [trails, setTrails] = useState([]);
    const [formData, setFormData] = useState({
      trailId: '',
      title: '',
      description: '',
      startDate: '',
      endDate: '',
      maxParticipants: '',
      needPorter: false,
      registrationDeadline: '',
      estimatedCost: ''
    });

    useEffect(() => {
      loadLocations();
    }, []);

    const loadLocations = async () => {
      try {
        const res = await api.locations.getAll();
        setLocations(res.data);
      } catch (err) {
        console.error('Error loading locations:', err);
      }
    };

    const loadTrails = async (locationId) => {
      try {
        const res = await api.trails.getAll(locationId);
        setTrails(res.data);
      } catch (err) {
        console.error('Error loading trails:', err);
      }
    };

    const handleSubmit = async (e) => {
      e.preventDefault();
      try {
        await api.trips.create(formData);
        showNotification('Tạo chuyến đi thành công!');
        setCurrentView('trips');
      } catch (err) {
        showNotification(err.response?.data?.error || 'Tạo chuyến đi thất bại', 'error');
      }
    };

    return (
      <div className="create-trip-page">
        <div className="container">
          <div className="page-header">
            <h1>Tạo chuyến đi mới</h1>
            <p>Điền thông tin chi tiết về chuyến đi của bạn</p>
          </div>

          <div className="form-card">
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Địa điểm</label>
                <select
                  onChange={(e) => {
                    loadTrails(e.target.value);
                    setFormData({...formData, trailId: ''});
                  }}
                  required>
                  <option value="">Chọn địa điểm</option>
                  {locations.map(loc => (
                    <option key={loc.location_id} value={loc.location_id}>
                      {loc.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Cung đường</label>
                <select
                  value={formData.trailId}
                  onChange={(e) => setFormData({...formData, trailId: e.target.value})}
                  required>
                  <option value="">Chọn cung đường</option>
                  {trails.map(trail => (
                    <option key={trail.trail_id} value={trail.trail_id}>
                      {trail.name} - {trail.difficulty}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Tiêu đề chuyến đi</label>
                <input
                  type="text"
                  placeholder="Ví dụ: Leo núi Sa Mu - U Bò"
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                  required
                />
              </div>

              <div className="form-group">
                <label>Mô tả</label>
                <textarea
                  rows="4"
                  placeholder="Mô tả chi tiết về chuyến đi..."
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  required
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Ngày khởi hành</label>
                  <input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData({...formData, startDate: e.target.value})}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Ngày kết thúc</label>
                  <input
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => setFormData({...formData, endDate: e.target.value})}
                    required
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Số lượng thành viên tối đa</label>
                  <input
                    type="number"
                    min="1"
                    placeholder="10"
                    value={formData.maxParticipants}
                    onChange={(e) => setFormData({...formData, maxParticipants: e.target.value})}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Chi phí ước tính (VNĐ)</label>
                  <input
                    type="number"
                    placeholder="1200000"
                    value={formData.estimatedCost}
                    onChange={(e) => setFormData({...formData, estimatedCost: e.target.value})}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Hạn chót đăng ký</label>
                <input
                  type="date"
                  value={formData.registrationDeadline}
                  onChange={(e) => setFormData({...formData, registrationDeadline: e.target.value})}
                  required
                />
              </div>

              <div className="form-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={formData.needPorter}
                    onChange={(e) => setFormData({...formData, needPorter: e.target.checked})}
                  />
                  Cần thuê Porter
                </label>
              </div>

              <div className="form-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setCurrentView('trips')}>
                  Hủy
                </button>
                <button type="submit" className="btn btn-primary">
                  Tạo chuyến đi
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  };

  // Admin Locations Management
  const AdminLocationsPage = () => {
    const [locations, setLocations] = useState([]);
    const [trails, setTrails] = useState([]);
    const [showLocationForm, setShowLocationForm] = useState(false);
    const [showTrailForm, setShowTrailForm] = useState(false);
    const [locationForm, setLocationForm] = useState({ name: '', description: '' });
    const [trailForm, setTrailForm] = useState({
      locationId: '',
      name: '',
      difficulty: 'Cơ bản',
      description: '',
      averageDist: '',
      averageTime: '',
      altitude: ''
    });

    useEffect(() => {
      loadLocations();
      loadTrails();
    }, []);

    const loadLocations = async () => {
      try {
        const res = await api.locations.getAll();
        setLocations(res.data);
      } catch (err) {
        console.error('Error loading locations:', err);
      }
    };

    const loadTrails = async () => {
      try {
        const res = await api.trails.getAll();
        setTrails(res.data);
      } catch (err) {
        console.error('Error loading trails:', err);
      }
    };

    const handleCreateLocation = async (e) => {
      e.preventDefault();
      try {
        await api.locations.create(locationForm);
        showNotification('Tạo địa điểm thành công!');
        setLocationForm({ name: '', description: '' });
        setShowLocationForm(false);
        loadLocations();
      } catch (err) {
        showNotification('Tạo địa điểm thất bại', 'error');
      }
    };

    const handleCreateTrail = async (e) => {
      e.preventDefault();
      try {
        await api.trails.create(trailForm);
        showNotification('Tạo cung đường thành công!');
        setTrailForm({
          locationId: '',
          name: '',
          difficulty: 'Cơ bản',
          description: '',
          averageDist: '',
          averageTime: '',
          altitude: ''
        });
        setShowTrailForm(false);
        loadTrails();
      } catch (err) {
        showNotification('Tạo cung đường thất bại', 'error');
      }
    };

    return (
      <div className="admin-page">
        <div className="container">
          <div className="page-header">
            <h1>Quản lý Địa điểm & Cung đường</h1>
          </div>

          <div className="admin-grid">
            <div className="admin-section">
              <div className="section-header">
                <h2><MapPinned size={24} /> Địa điểm</h2>
                <button className="btn btn-primary" onClick={() => setShowLocationForm(!showLocationForm)}>
                  <Plus size={20} /> Thêm địa điểm
                </button>
              </div>

              {showLocationForm && (
                <div className="form-card mb-4">
                  <form onSubmit={handleCreateLocation}>
                    <div className="form-group">
                      <label>Tên địa điểm</label>
                      <input
                        type="text"
                        value={locationForm.name}
                        onChange={(e) => setLocationForm({...locationForm, name: e.target.value})}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label>Mô tả</label>
                      <textarea
                        value={locationForm.description}
                        onChange={(e) => setLocationForm({...locationForm, description: e.target.value})}
                        required
                      />
                    </div>
                    <div className="form-actions">
                      <button type="button" className="btn btn-secondary" onClick={() => setShowLocationForm(false)}>
                        Hủy
                      </button>
                      <button type="submit" className="btn btn-primary">Lưu</button>
                    </div>
                  </form>
                </div>
              )}

              <div className="data-table">
                <table>
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Tên</th>
                      <th>Mô tả</th>
                    </tr>
                  </thead>
                  <tbody>
                    {locations.map(loc => (
                      <tr key={loc.location_id}>
                        <td>{loc.location_id}</td>
                        <td><strong>{loc.name}</strong></td>
                        <td>{loc.description}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="admin-section">
              <div className="section-header">
                <h2><Mountain size={24} /> Cung đường</h2>
                <button className="btn btn-primary" onClick={() => setShowTrailForm(!showTrailForm)}>
                  <Plus size={20} /> Thêm cung đường
                </button>
              </div>

              {showTrailForm && (
                <div className="form-card mb-4">
                  <form onSubmit={handleCreateTrail}>
                    <div className="form-group">
                      <label>Địa điểm</label>
                      <select
                        value={trailForm.locationId}
                        onChange={(e) => setTrailForm({...trailForm, locationId: e.target.value})}
                        required>
                        <option value="">Chọn địa điểm</option>
                        {locations.map(loc => (
                          <option key={loc.location_id} value={loc.location_id}>{loc.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Tên cung đường</label>
                      <input
                        type="text"
                        value={trailForm.name}
                        onChange={(e) => setTrailForm({...trailForm, name: e.target.value})}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label>Độ khó</label>
                      <select
                        value={trailForm.difficulty}
                        onChange={(e) => setTrailForm({...trailForm, difficulty: e.target.value})}>
                        <option>Nhập môn</option>
                        <option>Cơ bản</option>
                        <option>Nâng cao</option>
                        <option>Thách thức</option>
                        <option>Cực khó</option>
                      </select>
                    </div>
                    <div className="form-row">
                      <div className="form-group">
                        <label>Quãng đường (km)</label>
                        <input
                          type="number"
                          step="0.1"
                          value={trailForm.averageDist}
                          onChange={(e) => setTrailForm({...trailForm, averageDist: e.target.value})}
                        />
                      </div>
                      <div className="form-group">
                        <label>Độ cao (m)</label>
                        <input
                          type="number"
                          value={trailForm.altitude}
                          onChange={(e) => setTrailForm({...trailForm, altitude: e.target.value})}
                        />
                      </div>
                    </div>
                    <div className="form-group">
                      <label>Thời gian</label>
                      <input
                        type="text"
                        placeholder="2 ngày 1 đêm"
                        value={trailForm.averageTime}
                        onChange={(e) => setTrailForm({...trailForm, averageTime: e.target.value})}
                      />
                    </div>
                    <div className="form-group">
                      <label>Mô tả</label>
                      <textarea
                        value={trailForm.description}
                        onChange={(e) => setTrailForm({...trailForm, description: e.target.value})}
                      />
                    </div>
                    <div className="form-actions">
                      <button type="button" className="btn btn-secondary" onClick={() => setShowTrailForm(false)}>
                        Hủy
                      </button>
                      <button type="submit" className="btn btn-primary">Lưu</button>
                    </div>
                  </form>
                </div>
              )}

              <div className="data-table">
                <table>
                  <thead>
                    <tr>
                      <th>Tên</th>
                      <th>Địa điểm</th>
                      <th>Độ khó</th>
                      <th>Quãng đường</th>
                    </tr>
                  </thead>
                  <tbody>
                    {trails.map(trail => (
                      <tr key={trail.trail_id}>
                        <td><strong>{trail.name}</strong></td>
                        <td>{trail.location_name}</td>
                        <td><span className="badge">{trail.difficulty}</span></td>
                        <td>{trail.average_dist} km</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Admin Dashboard
  const AdminDashboard = () => {
    const [stats, setStats] = useState(null);
    const [reports, setReports] = useState([]);
    const [ratings, setRatings] = useState([]);

    useEffect(() => {
      loadStats();
      loadReports();
      loadRatings();
    }, []);

    const loadStats = async () => {
      try {
        const res = await api.stats.getOverview();
        setStats(res.data);
      } catch (err) {
        console.error('Error loading stats:', err);
      }
    };

    const loadReports = async () => {
      try {
        const res = await api.reports.getAll();
        setReports(res.data);
      } catch (err) {
        console.error('Error loading reports:', err);
      }
    };

    const loadRatings = async () => {
      try {
        const res = await api.ratings.getAll();
        setRatings(res.data);
      } catch (err) {
        console.error('Error loading ratings:', err);
      }
    };

    const handleReportAction = async (reportId, status) => {
      try {
        await api.reports.update(reportId, status);
        showNotification('Cập nhật báo cáo thành công!');
        loadReports();
      } catch (err) {
        showNotification('Cập nhật báo cáo thất bại', 'error');
      }
    };

    return (
      <div className="admin-page">
        <div className="container">
          <div className="page-header">
            <h1>Dashboard</h1>
          </div>

          {stats && (
            <div className="stats-grid">
              <div className="stat-card">
                <Users className="stat-icon" />
                <div>
                  <p className="stat-label">Tổng người dùng</p>
                  <p className="stat-value">{stats.total_users}</p>
                </div>
              </div>
              <div className="stat-card">
                <UserPlus className="stat-icon" />
                <div>
                  <p className="stat-label">Porter</p>
                  <p className="stat-value">{stats.total_porters}</p>
                </div>
              </div>
              <div className="stat-card">
                <Mountain className="stat-icon" />
                <div>
                  <p className="stat-label">Tổng chuyến đi</p>
                  <p className="stat-value">{stats.total_trips}</p>
                </div>
              </div>
              <div className="stat-card">
                <Check className="stat-icon" />
                <div>
                  <p className="stat-label">Hoàn thành</p>
                  <p className="stat-value">{stats.completed_trips}</p>
                </div>
              </div>
              <div className="stat-card">
                <AlertCircle className="stat-icon" />
                <div>
                  <p className="stat-label">Báo cáo chờ xử lý</p>
                  <p className="stat-value">{stats.pending_reports}</p>
                </div>
              </div>
            </div>
          )}

          <div className="admin-grid">
            <div className="admin-section">
              <h2><AlertCircle size={24} /> Báo cáo chờ xử lý</h2>
              <div className="data-table">
                <table>
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Người báo cáo</th>
                      <th>Loại</th>
                      <th>Nội dung</th>
                      <th>Trạng thái</th>
                      <th>Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reports.filter(r => r.status === 'Pending').map(report => (
                      <tr key={report.report_id}>
                        <td>{report.report_id}</td>
                        <td>{report.reporter_name}</td>
                        <td><span className="badge">{report.report_type}</span></td>
                        <td className="truncate">{report.content}</td>
                        <td><span className="badge badge-orange">{report.status}</span></td>
                        <td>
                          <button 
                            className="btn-icon btn-success"
                            onClick={() => handleReportAction(report.report_id, 'Done')}
                            title="Đã xử lý">
                            <Check size={16} />
                          </button>
                          <button 
                            className="btn-icon btn-danger"
                            onClick={() => handleReportAction(report.report_id, 'Dismissed')}
                            title="Bác bỏ">
                            <X size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="admin-section">
              <h2><Star size={24} /> Đánh giá gần đây</h2>
              <div className="ratings-list">
                {ratings.slice(0, 10).map(rating => (
                  <div key={rating.rating_id} className="rating-item">
                    <div className="rating-header">
                      <strong>{rating.rater_name}</strong>
                      <span> đánh giá </span>
                      <strong>{rating.rated_name}</strong>
                      <span className={`badge badge-${rating.rating_type === 'Porter' ? 'blue' : 'green'}`}>
                        {rating.rating_type}
                      </span>
                    </div>
                    <div className="rating-stars">
                      {'⭐'.repeat(rating.score)}
                    </div>
                    {rating.comment && (
                      <p className="rating-comment">{rating.comment}</p>
                    )}
                    <small className="rating-trip">Chuyến: {rating.trip_title}</small>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Trip Detail Page
  const TripDetailPage = () => {
    const [trip, setTrip] = useState(null);
    const [participants, setParticipants] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
      if (selectedTripId) {
        loadTripDetails();
        loadParticipants();
      }
    }, [selectedTripId]);

    const loadTripDetails = async () => {
      try {
        const res = await api.trips.getOne(selectedTripId);
        setTrip(res.data);
        setLoading(false);
      } catch (err) {
        showNotification('Không thể tải thông tin chuyến đi', 'error');
        setLoading(false);
      }
    };

    const loadParticipants = async () => {
      try {
        const res = await api.trips.getParticipants(selectedTripId);
        setParticipants(res.data);
      } catch (err) {
        console.error('Error loading participants:', err);
      }
    };

    const handleApproveParticipant = async (participationId) => {
      try {
        await api.participations.update(participationId, 'Confirmed');
        showNotification('Đã duyệt thành viên!');
        loadParticipants();
        loadTripDetails();
      } catch (err) {
        showNotification('Không thể duyệt thành viên', 'error');
      }
    };

    const handleRejectParticipant = async (participationId) => {
      try {
        await api.participations.update(participationId, 'Declined');
        showNotification('Đã từ chối yêu cầu!');
        loadParticipants();
      } catch (err) {
        showNotification('Không thể từ chối yêu cầu', 'error');
      }
    };

    const handleUpdateTripStatus = async (newStatus) => {
      try {
        await api.trips.update(selectedTripId, { ...trip, status: newStatus });
        showNotification('Cập nhật trạng thái thành công!');
        loadTripDetails();
      } catch (err) {
        showNotification('Không thể cập nhật trạng thái', 'error');
      }
    };

    const canManageTrip = user && (user.role === 'Admin' || trip?.leader_id === user.user_id);

    if (loading) {
      return (
        <div className="create-trip-page">
          <div className="container">
            <p>Đang tải...</p>
          </div>
        </div>
      );
    }

    if (!trip) return null;

    const statusColors = {
      'Draft': 'badge-orange',
      'Pending': 'badge-blue',
      'Finalized': 'badge-green',
      'In Process': 'badge-purple',
      'Completed': 'badge-green',
      'Canceled': 'badge-red'
    };

    return (
      <div className="create-trip-page">
        <div className="container">
          <div className="page-header">
            <button 
              className="btn btn-secondary"
              onClick={() => setCurrentView('trips')}
              style={{ marginBottom: '1rem' }}>
              ← Quay lại
            </button>
            <h1>{trip.title}</h1>
            <span className={`badge ${statusColors[trip.status]}`}>{trip.status}</span>
          </div>

          <div className="form-card">
            <div className="trip-detail-section">
              <h3><MapPinned size={20} /> Thông tin chuyến đi</h3>
              <div className="info-grid">
                <div className="info-item">
                  <label>Địa điểm:</label>
                  <p>{trip.location_name}</p>
                </div>
                <div className="info-item">
                  <label>Cung đường:</label>
                  <p>{trip.trail_name} - <span className="badge">{trip.difficulty}</span></p>
                </div>
                <div className="info-item">
                  <label>Người tổ chức:</label>
                  <p>{trip.leader_name}</p>
                </div>
                <div className="info-item">
                  <label>Ngày khởi hành:</label>
                  <p>{new Date(trip.start_date).toLocaleDateString('vi-VN')}</p>
                </div>
                <div className="info-item">
                  <label>Ngày kết thúc:</label>
                  <p>{new Date(trip.end_date).toLocaleDateString('vi-VN')}</p>
                </div>
                <div className="info-item">
                  <label>Số lượng:</label>
                  <p>{trip.confirmed_participants}/{trip.max_participants} người</p>
                </div>
                <div className="info-item">
                  <label>Chi phí ước tính:</label>
                  <p><strong>{trip.estimated_cost?.toLocaleString()}đ</strong></p>
                </div>
                <div className="info-item">
                  <label>Hạn chót đăng ký:</label>
                  <p>{new Date(trip.registration_deadline).toLocaleDateString('vi-VN')}</p>
                </div>
              </div>
              <div className="info-item" style={{ marginTop: '1rem' }}>
                <label>Mô tả:</label>
                <p>{trip.description}</p>
              </div>
            </div>

            {canManageTrip && (
              <div className="trip-detail-section" style={{ marginTop: '2rem' }}>
                <h3><Users size={20} /> Quản lý thành viên ({participants.length})</h3>
                
                {participants.length === 0 ? (
                  <p style={{ color: '#047857', textAlign: 'center', padding: '2rem' }}>
                    Chưa có ai đăng ký tham gia
                  </p>
                ) : (
                  <div className="data-table">
                    <table>
                      <thead>
                        <tr>
                          <th>Họ tên</th>
                          <th>Email</th>
                          <th>Điện thoại</th>
                          <th>Vai trò</th>
                          <th>Trạng thái</th>
                          <th>Thao tác</th>
                        </tr>
                      </thead>
                      <tbody>
                        {participants.map(p => (
                          <tr key={p.participation_id}>
                            <td><strong>{p.name}</strong></td>
                            <td>{p.email}</td>
                            <td>{p.phone || '-'}</td>
                            <td><span className="badge">{p.role}</span></td>
                            <td>
                              <span className={`badge ${
                                p.status === 'Confirmed' ? 'badge-green' :
                                p.status === 'Pending' ? 'badge-orange' :
                                p.status === 'Declined' ? 'badge-red' : 'badge-blue'
                              }`}>
                                {p.status}
                              </span>
                            </td>
                            <td>
                              {p.status === 'Pending' && (
                                <>
                                  <button
                                    className="btn-icon btn-success"
                                    onClick={() => handleApproveParticipant(p.participation_id)}
                                    title="Duyệt">
                                    <Check size={16} />
                                  </button>
                                  <button
                                    className="btn-icon btn-danger"
                                    onClick={() => handleRejectParticipant(p.participation_id)}
                                    title="Từ chối">
                                    <X size={16} />
                                  </button>
                                </>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {canManageTrip && (
              <div className="trip-detail-section" style={{ marginTop: '2rem' }}>
                <h3>Quản lý trạng thái</h3>
                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                  {trip.status === 'Draft' && (
                    <button 
                      className="btn btn-primary"
                      onClick={() => handleUpdateTripStatus('Pending')}>
                      Mở đăng ký
                    </button>
                  )}
                  {trip.status === 'Pending' && (
                    <button 
                      className="btn btn-primary"
                      onClick={() => handleUpdateTripStatus('Finalized')}>
                      Hoàn tất đăng ký
                    </button>
                  )}
                  {trip.status === 'Finalized' && (
                    <button 
                      className="btn btn-primary"
                      onClick={() => handleUpdateTripStatus('In Process')}>
                      Bắt đầu chuyến đi
                    </button>
                  )}
                  {trip.status === 'In Process' && (
                    <button 
                      className="btn btn-primary"
                      onClick={() => handleUpdateTripStatus('Completed')}>
                      Hoàn thành chuyến đi
                    </button>
                  )}
                  {trip.status !== 'Canceled' && trip.status !== 'Completed' && (
                    <button 
                      className="btn btn-danger"
                      onClick={() => handleUpdateTripStatus('Canceled')}>
                      Hủy chuyến đi
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Admin Trips Management Page
  const AdminTripsPage = () => {
    const [trips, setTrips] = useState([]);

    useEffect(() => {
      loadAllTrips();
    }, []);

    const loadAllTrips = async () => {
      try {
        const res = await api.trips.getAll({});
        setTrips(res.data);
      } catch (err) {
        console.error('Error loading trips:', err);
      }
    };

    const statusColors = {
      'Draft': 'badge-orange',
      'Pending': 'badge-blue',
      'Finalized': 'badge-green',
      'In Process': 'badge-purple',
      'Completed': 'badge-green',
      'Canceled': 'badge-red'
    };

    return (
      <div className="admin-page">
        <div className="container">
          <div className="page-header">
            <h1>Quản lý tất cả chuyến đi</h1>
            <button 
              className="btn btn-primary"
              onClick={() => setCurrentView('create-trip')}>
              <Plus size={20} /> Tạo chuyến đi mới
            </button>
          </div>

          <div className="form-card">
            <div className="data-table">
              <table>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Tiêu đề</th>
                    <th>Người tổ chức</th>
                    <th>Địa điểm</th>
                    <th>Ngày khởi hành</th>
                    <th>Số người</th>
                    <th>Trạng thái</th>
                    <th>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {trips.map(trip => (
                    <tr key={trip.trip_id}>
                      <td>{trip.trip_id}</td>
                      <td><strong>{trip.title}</strong></td>
                      <td>{trip.leader_name}</td>
                      <td>{trip.location_name}</td>
                      <td>{new Date(trip.start_date).toLocaleDateString('vi-VN')}</td>
                      <td>{trip.confirmed_participants}/{trip.max_participants}</td>
                      <td>
                        <span className={`badge ${statusColors[trip.status]}`}>
                          {trip.status}
                        </span>
                      </td>
                      <td>
                        <button
                          className="btn btn-secondary"
                          style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}
                          onClick={() => {
                            setSelectedTripId(trip.trip_id);
                            setCurrentView('trip-detail');
                          }}>
                          Chi tiết
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Notification Component
  const Notification = () => {
    if (!notification) return null;
    
    return (
      <div className={`notification notification-${notification.type}`}>
        {notification.type === 'success' ? <Check size={20} /> : <AlertCircle size={20} />}
        <span>{notification.message}</span>
      </div>
    );
  };

  // Footer Component
  const Footer = () => (
    <footer className="footer">
      <div className="container">
        <div className="footer-grid">
          <div>
            <div className="footer-logo">
              <Mountain size={32} />
              <span>TrekConnect</span>
            </div>
            <p>Nền tảng kết nối cộng đồng đam mê trekking tại Việt Nam.</p>
          </div>
          
          <div>
            <h4>Trang</h4>
            <ul>
              <li><a onClick={() => setCurrentView('landing')}>Trang chủ</a></li>
              <li><a onClick={() => setCurrentView('trips')}>Chuyến đi</a></li>
              <li><a>Liên hệ</a></li>
            </ul>
          </div>
          
          <div>
            <h4>Hỗ trợ</h4>
            <ul>
              <li><a>Chính sách bảo mật</a></li>
              <li><a>Điều khoản sử dụng</a></li>
            </ul>
          </div>
          
          <div>
            <h4>Liên hệ</h4>
            <p>Email: info@trekconnect.vn</p>
            <p>Hotline: 1900 xxxx</p>
          </div>
        </div>
        
        <div className="footer-bottom">
          <p>© 2025 TrekConnect. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );

  // Main Render
  return (
    <div className="app">
      <Header />
      <Notification />
      
      <main className="main-content">
        {currentView === 'landing' && <LandingPage />}
        {currentView === 'login' && <LoginPage />}
        {currentView === 'register' && <RegisterPage />}
        {currentView === 'trips' && <TripsPage />}
        {currentView === 'trip-detail' && <TripDetailPage />}
        {currentView === 'create-trip' && <CreateTripPage />}
        {currentView === 'admin-trips' && user?.role === 'Admin' && <AdminTripsPage />}
        {currentView === 'admin-locations' && user?.role === 'Admin' && <AdminLocationsPage />}
        {currentView === 'admin-dashboard' && user?.role === 'Admin' && <AdminDashboard />}
      </main>
      
      <Footer />
    </div>
  );
}

export default App;
