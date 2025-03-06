import React from 'react';
import { useNavigate } from 'react-router-dom';

function Forum() {
    const navigate = useNavigate(); // Hook pour la navigation

    return (
        <div>
            <main className="main">
                {/* breadcrumb */}
                <div className="site-breadcrumb" style={{ background: "url(assets/img/breadcrumb/01.jpg)" }}>
                    <div className="container">
                        <h2 className="breadcrumb-title">Forum</h2>
                        <ul className="breadcrumb-menu">
                            <li><a href="/Home">Home</a></li>
                            <li className="active">Forum</li>
                        </ul>
                    </div>
                </div>
                {/* breadcrumb end */}
                {/* Forum section */}
                <div className="forum-area py-100">
                    <div className="container">
                        <div className="forum-header d-flex justify-content-between align-items-center mb-4">
                            <button className="theme-btn" onClick={() => navigate("/addforum")}>Add New Topic</button>
                            <div className="forum-filters d-flex gap-3">
                            <input type="text" className="form-control rounded-full w-96" placeholder="Search topics..." />
                                <select className="form-select">
                                    <option value="latest">Latest</option>
                                    <option value="oldest">Oldest</option>
                                </select>
                            </div>
                        </div>
                        <div className="forum-list">
                            {/* Exemple de sujet */}
                            <div className="forum-item p-3 border rounded mb-3">
                                <h5 className="mb-1"><a href="#">How to implement authentication in React?</a></h5>
                                <p className="mb-0 text-muted">Posted by John Doe | 2 hours ago</p>
                            </div>
                            <div className="forum-item p-3 border rounded mb-3">
                                <h5 className="mb-1"><a href="#">Best practices for managing state in large applications</a></h5>
                                <p className="mb-0 text-muted">Posted by Jane Smith | 1 day ago</p>
                            </div>
                        </div>
                    </div>
                </div>
                {/* Forum section end */}
            </main>
        </div>
    );
}

export default Forum;
