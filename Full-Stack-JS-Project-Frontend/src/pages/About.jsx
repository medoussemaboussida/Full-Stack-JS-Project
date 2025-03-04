import React from 'react'; 

function About(){
    return(
        <div>
<main className="main">
  {/* breadcrumb */}
  <div
    className="site-breadcrumb"
    style={{ background: "url(assets/img/breadcrumb/01.jpg)" }}
  >
    <div className="container">
      <h2 className="breadcrumb-title">About Us</h2>
      <ul className="breadcrumb-menu">
        <li>
          <a href="/Home">Home</a>
        </li>
        <li className="active">About Us</li>
      </ul>
    </div>
  </div>
  {/* breadcrumb end */}
  {/* about area */}
  <div className="about-area py-100">
    <div className="container">
      <div className="row">
        <div className="col-lg-6">
          <div className="about-left wow fadeInLeft" data-wow-delay=".25s">
            <div className="about-img">
              <div className="row">
                <div className="col-6">
                  <img className="img-1" src="assets/img/about/01.jpg" alt="" />
                </div>
                <div className="col-6">
                  <div className="about-experience">
                    <h5>
                      30<span>+</span>
                    </h5>
                    <p>Years Of Experience</p>
                  </div>
                  <div className="img-2">
                    <img src="assets/img/about/02.jpg" alt="" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="col-lg-6">
          <div className="about-right wow fadeInUp" data-wow-delay=".25s">
            <div className="site-heading mb-3">
              <span className="site-title-tagline">
                <i className="far fa-hand-heart" /> About Us
              </span>
              <h2 className="site-title">
                We Are The Best and Expert <span>For Senior</span> Care
              </h2>
            </div>
            <p className="about-text">
              There are many variations of passages available but the majority
              have suffered alteration in some form by injected humour
              randomised words look even. Many desktop packages and web page
              editors now their default model text.
            </p>
            <div className="about-content">
              <div className="about-item">
                <div className="icon">
                  <img src="assets/img/icon/team.svg" alt="" />
                </div>
                <div className="content">
                  <h6>Our Experts Nurse</h6>
                  <p>
                    It is a long established fact that a reader will be
                    distracted by the readable content of a page when looking at
                    its layout.
                  </p>
                </div>
              </div>
              <div className="about-item">
                <div className="icon">
                  <img src="assets/img/icon/support-2.svg" alt="" />
                </div>
                <div className="content">
                  <h6>24/7 Live Support</h6>
                  <p>
                    It is a long established fact that a reader will be
                    distracted by the readable content of a page when looking at
                    its layout.
                  </p>
                </div>
              </div>
            </div>
            <a href="about.html" className="theme-btn">
              Discover More
              <i className="fas fa-circle-arrow-right" />
            </a>
          </div>
        </div>
      </div>
    </div>
  </div>
  {/* about area end */}
  {/* counter area */}
  <div className="counter-area">
    <div className="counter-wrap">
      <div className="container">
        <div className="row g-4">
          <div className="col-lg-3 col-sm-6">
            <div className="counter-box">
              <div className="icon">
                <img src="assets/img/icon/senior-care.svg" alt="" />
              </div>
              <div>
                <span
                  className="counter"
                  data-count="+"
                  data-to={6560}
                  data-speed={3000}
                >
                  6560
                </span>
                <h6 className="title">+ Projects Done </h6>
              </div>
            </div>
          </div>
          <div className="col-lg-3 col-sm-6">
            <div className="counter-box">
              <div className="icon">
                <img src="assets/img/icon/happy.svg" alt="" />
              </div>
              <div>
                <span
                  className="counter"
                  data-count="+"
                  data-to={7320}
                  data-speed={3000}
                >
                  7320
                </span>
                <h6 className="title">+ Happy Clients</h6>
              </div>
            </div>
          </div>
          <div className="col-lg-3 col-sm-6">
            <div className="counter-box">
              <div className="icon">
                <img src="assets/img/icon/volunteer.svg" alt="" />
              </div>
              <div>
                <span
                  className="counter"
                  data-count="+"
                  data-to={1500}
                  data-speed={3000}
                >
                  1500
                </span>
                <h6 className="title">+ Our Volunteer</h6>
              </div>
            </div>
          </div>
          <div className="col-lg-3 col-sm-6">
            <div className="counter-box">
              <div className="icon">
                <img src="assets/img/icon/award.svg" alt="" />
              </div>
              <div>
                <span
                  className="counter"
                  data-count="+"
                  data-to={50}
                  data-speed={3000}
                >
                  50
                </span>
                <h6 className="title">+ Win Awards</h6>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
  {/* counter area end */}
  {/* team-area */}
  <div className="team-area py-100">
    <div className="container">
      <div className="row">
        <div className="col-lg-6 mx-auto">
          <div
            className="site-heading text-center wow fadeInDown"
            data-wow-delay=".25s"
          >
            <span className="site-title-tagline">
              <i className="far fa-hand-heart" /> Our Volunteers
            </span>
            <h2 className="site-title">
              Meet With Our Awesome <span>Volunteers</span>
            </h2>
          </div>
        </div>
      </div>
      <div className="row g-4">
        <div className="col-md-6 col-lg-3">
          <div className="team-item wow fadeInUp" data-wow-delay=".25s">
            <div className="team-img">
              <img src="assets/img/team/01.jpg" alt="thumb" />
              <div className="team-social-wrap">
                <div className="team-social-btn">
                  <button type="button">
                    <i className="far fa-share-alt" />
                  </button>
                </div>
                <div className="team-social">
                  <a href="#">
                    <i className="fab fa-facebook-f" />
                  </a>
                  <a href="#">
                    <i className="fab fa-x-twitter" />
                  </a>
                  <a href="#">
                    <i className="fab fa-linkedin-in" />
                  </a>
                  <a href="#">
                    <i className="fab fa-youtube" />
                  </a>
                </div>
              </div>
            </div>
            <div className="team-content">
              <h4>
                <a href="team.html">Oussema Boussida</a>
              </h4>
              <span>Volunteer</span>
            </div>
          </div>
        </div>
        <div className="col-md-6 col-lg-3">
          <div className="team-item wow fadeInUp" data-wow-delay=".25s">
            <div className="team-img">
              <img src="assets/img/team/05.jpg" alt="thumb" />
              <div className="team-social-wrap">
                <div className="team-social-btn">
                  <button type="button">
                    <i className="far fa-share-alt" />
                  </button>
                </div>
                <div className="team-social">
                  <a href="#">
                    <i className="fab fa-facebook-f" />
                  </a>
                  <a href="#">
                    <i className="fab fa-x-twitter" />
                  </a>
                  <a href="#">
                    <i className="fab fa-linkedin-in" />
                  </a>
                  <a href="#">
                    <i className="fab fa-youtube" />
                  </a>
                </div>
              </div>
            </div>
            <div className="team-content">
              <h4>
                <a href="team.html">Asma Riahi</a>
              </h4>
              <span>Volunteer</span>
            </div>
          </div>
        </div>
        
        <div className="col-md-6 col-lg-3">
          <div className="team-item wow fadeInUp" data-wow-delay=".50s">
            <div className="team-img">
              <img src="assets/img/team/02.jpg" alt="thumb" />
              <div className="team-social-wrap">
                <div className="team-social-btn">
                  <button type="button">
                    <i className="far fa-share-alt" />
                  </button>
                </div>
                <div className="team-social">
                  <a href="#">
                    <i className="fab fa-facebook-f" />
                  </a>
                  <a href="#">
                    <i className="fab fa-x-twitter" />
                  </a>
                  <a href="#">
                    <i className="fab fa-linkedin-in" />
                  </a>
                  <a href="#">
                    <i className="fab fa-youtube" />
                  </a>
                </div>
              </div>
            </div>
            <div className="team-content">
              <h4>
                <a href="team.html">Dr.Taher Ben Lakhdar</a>
              </h4>
              <span>CEO &amp; Founder</span>
            </div>
          </div>
        </div>
        <div className="col-md-6 col-lg-3">
          <div className="team-item wow fadeInUp" data-wow-delay=".75s">
            <div className="team-img">
              <img src="assets/img/team/03.jpg" alt="thumb" />
              <div className="team-social-wrap">
                <div className="team-social-btn">
                  <button type="button">
                    <i className="far fa-share-alt" />
                  </button>
                </div>
                <div className="team-social">
                  <a href="#">
                    <i className="fab fa-facebook-f" />
                  </a>
                  <a href="#">
                    <i className="fab fa-x-twitter" />
                  </a>
                  <a href="#">
                    <i className="fab fa-linkedin-in" />
                  </a>
                  <a href="#">
                    <i className="fab fa-youtube" />
                  </a>
                </div>
              </div>
            </div>
            <div className="team-content">
              <h4>
                <a href="team.html">Ghassen Ben Mahmoud</a>
              </h4>
              <span>Volunteer</span>
            </div>
          </div>
        </div>
        <div className="col-md-6 col-lg-3">
          <div className="team-item wow fadeInUp" data-wow-delay="1s">
            <div className="team-img">
              <img src="assets/img/team/04.jpg" alt="thumb" />
              <div className="team-social-wrap">
                <div className="team-social-btn">
                  <button type="button">
                    <i className="far fa-share-alt" />
                  </button>
                </div>
                <div className="team-social">
                  <a href="#">
                    <i className="fab fa-facebook-f" />
                  </a>
                  <a href="#">
                    <i className="fab fa-x-twitter" />
                  </a>
                  <a href="#">
                    <i className="fab fa-linkedin-in" />
                  </a>
                  <a href="#">
                    <i className="fab fa-youtube" />
                  </a>
                </div>
              </div>
            </div>
            <div className="team-content">
              <h4>
                <a href="team.html">Roumaissa Zdiri</a>
              </h4>
              <span>Volunteer</span>
            </div>

            
          </div>
          
        </div>

        <div className="col-md-6 col-lg-3">
          <div className="team-item wow fadeInUp" data-wow-delay="1s">
            <div className="team-img">
              <img src="assets/img/team/md.jpg" alt="thumb" />
              <div className="team-social-wrap">
                <div className="team-social-btn">
                  <button type="button">
                    <i className="far fa-share-alt" />
                  </button>
                </div>
                <div className="team-social">
                  <a href="#">
                    <i className="fab fa-facebook-f" />
                  </a>
                  <a href="#">
                    <i className="fab fa-x-twitter" />
                  </a>
                  <a href="#">
                    <i className="fab fa-linkedin-in" />
                  </a>
                  <a href="#">
                    <i className="fab fa-youtube" />
                  </a>
                </div>
              </div>
            </div>
            <div className="team-content">
              <h4>
                <a href="team.html">Dhahbi Yassine</a>
              </h4>
              <span>Volunteer</span>
            </div>

            
          </div>
          
        </div>
      </div>
    </div>
  </div>
  {/* team-area end */}


  {/* testimonial-area */}
  <div className="testimonial-area testimonial-bg pt-80 pb-60">
    <div className="container">
      <div className="row">
        <div className="col-lg-7 mx-auto">
          <div
            className="site-heading text-center wow fadeInDown"
            data-wow-delay=".25s"
          >
            <span className="site-title-tagline">
              <i className="far fa-hand-heart" /> Testimonials
            </span>
            <h2 className="site-title text-white">
              What Our Awesome <span>Clients Say</span> About Us
            </h2>
          </div>
        </div>
      </div>
      <div
        className="testimonial-slider owl-carousel owl-theme wow fadeInUp"
        data-wow-delay=".25s"
      >
        <div className="testimonial-item">
          <div className="testimonial-shadow-icon">
            <img src="assets/img/icon/quote.svg" alt="" />
          </div>
          <div className="testimonial-content">
            <div className="testimonial-author-img">
              <img src="assets/img/testimonial/01.jpg" alt="" />
            </div>
            <div className="testimonial-author-info">
              <h4>Niesha Phips</h4>
              <p>Customer</p>
            </div>
          </div>
          <div className="testimonial-quote">
            <p>
              There are many variations passage available the majority have
              suffered of the alteration in some form by injected humour or
              randomised words which look even slightly believable.
            </p>
          </div>
          <div className="testimonial-rate">
            <i className="fas fa-star" />
            <i className="fas fa-star" />
            <i className="fas fa-star" />
            <i className="fas fa-star" />
            <i className="fas fa-star" />
          </div>
        </div>
        <div className="testimonial-item">
          <div className="testimonial-shadow-icon">
            <img src="assets/img/icon/quote.svg" alt="" />
          </div>
          <div className="testimonial-content">
            <div className="testimonial-author-img">
              <img src="assets/img/testimonial/02.jpg" alt="" />
            </div>
            <div className="testimonial-author-info">
              <h4>Daniel Porter</h4>
              <p>Customer</p>
            </div>
          </div>
          <div className="testimonial-quote">
            <p>
              There are many variations passage available the majority have
              suffered of the alteration in some form by injected humour or
              randomised words which look even slightly believable.
            </p>
          </div>
          <div className="testimonial-rate">
            <i className="fas fa-star" />
            <i className="fas fa-star" />
            <i className="fas fa-star" />
            <i className="fas fa-star" />
            <i className="fas fa-star" />
          </div>
        </div>
        <div className="testimonial-item">
          <div className="testimonial-shadow-icon">
            <img src="assets/img/icon/quote.svg" alt="" />
          </div>
          <div className="testimonial-content">
            <div className="testimonial-author-img">
              <img src="assets/img/testimonial/03.jpg" alt="" />
            </div>
            <div className="testimonial-author-info">
              <h4>Ebony Swihart</h4>
              <p>Customer</p>
            </div>
          </div>
          <div className="testimonial-quote">
            <p>
              There are many variations passage available the majority have
              suffered of the alteration in some form by injected humour or
              randomised words which look even slightly believable.
            </p>
          </div>
          <div className="testimonial-rate">
            <i className="fas fa-star" />
            <i className="fas fa-star" />
            <i className="fas fa-star" />
            <i className="fas fa-star" />
            <i className="fas fa-star" />
          </div>
        </div>
        <div className="testimonial-item">
          <div className="testimonial-shadow-icon">
            <img src="assets/img/icon/quote.svg" alt="" />
          </div>
          <div className="testimonial-content">
            <div className="testimonial-author-img">
              <img src="assets/img/testimonial/04.jpg" alt="" />
            </div>
            <div className="testimonial-author-info">
              <h4>Loreta Jones</h4>
              <p>Customer</p>
            </div>
          </div>
          <div className="testimonial-quote">
            <p>
              There are many variations passage available the majority have
              suffered of the alteration in some form by injected humour or
              randomised words which look even slightly believable.
            </p>
          </div>
          <div className="testimonial-rate">
            <i className="fas fa-star" />
            <i className="fas fa-star" />
            <i className="fas fa-star" />
            <i className="fas fa-star" />
            <i className="fas fa-star" />
          </div>
        </div>
      </div>
    </div>
  </div>
  {/* testimonial-area end */}
  {/* partner area */}
  <div className="partner-area bg pt-40 pb-40">
    <div className="container">
      <div className="partner-wrapper partner-slider owl-carousel owl-theme">
        <img src="assets/img/partner/01.png" alt="thumb" />
        <img src="assets/img/partner/02.png" alt="thumb" />
        <img src="assets/img/partner/03.png" alt="thumb" />
        <img src="assets/img/partner/04.png" alt="thumb" />
        <img src="assets/img/partner/05.png" alt="thumb" />
        <img src="assets/img/partner/02.png" alt="thumb" />
        <img src="assets/img/partner/03.png" alt="thumb" />
      </div>
    </div>
  </div>
  {/* partner area end*/}
  {/* skill-area */}
  <div className="skill-area py-100">
    <div className="container">
      <div className="skill-wrap">
        <div className="row g-4 align-items-center">
          <div className="col-lg-6">
            <div className="skill-img wow fadeInLeft" data-wow-delay=".25s">
              <img src="assets/img/skill/01.jpg" alt="thumb" />
            </div>
          </div>
          <div className="col-lg-6">
            <div className="skill-content wow fadeInUp" data-wow-delay=".25s">
              <span className="site-title-tagline">
                <i className="far fa-hand-heart" /> Our Skills
              </span>
              <h2 className="site-title">
                We Offers You Best <span>Senior Care</span> Services
              </h2>
              <p className="skill-text">
                There are many variations of passages of Lorem Ipsum available,
                but the majority have suffered alteration in some form, by
                injected humour, or randomised words which don't look even
                slightly believable.
              </p>
              <div className="skill-progress">
                <div className="progress-item">
                  <h5>
                    Best Quality Service <span className="percent">85%</span>
                  </h5>
                  <div className="progress" data-value={85}>
                    <div className="progress-bar" role="progressbar" />
                  </div>
                </div>
                <div className="progress-item">
                  <h5>
                    Our Experience <span className="percent">90%</span>
                  </h5>
                  <div className="progress" data-value={90}>
                    <div className="progress-bar" role="progressbar" />
                  </div>
                </div>
                <div className="progress-item">
                  <h5>
                    Senior Care <span className="percent">80%</span>
                  </h5>
                  <div className="progress" data-value={80}>
                    <div className="progress-bar" role="progressbar" />
                  </div>
                </div>
              </div>
              <a href="contact.html" className="theme-btn mt-5">
                Learn More
                <i className="fas fa-circle-arrow-right" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
  {/* skill-area end */}
</main>

            
        </div>
    )
}

export default About;