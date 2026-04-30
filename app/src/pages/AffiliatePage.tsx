import { Link } from 'react-router-dom';
import { ArrowLeft, DollarSign, Users, TrendingUp, CheckCircle, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';

const benefits = [
  {
    icon: DollarSign,
    title: '12% Commission',
    description: 'Earn 12% on every sale you refer. Competitive commission rates for sellers.'
  },
  {
    icon: Users,
    title: 'Seller Account',
    description: 'Register as a seller and get your unique referral link instantly.'
  },
  {
    icon: TrendingUp,
    title: 'Recurring Income',
    description: 'Earn on all future purchases from customers you refer.'
  },
  {
    icon: Zap,
    title: 'Instant Payouts',
    description: 'Get paid weekly via PayPal, bank transfer, or UPI. Minimum ₹500.'
  }
];

const steps = [
  {
    number: '01',
    title: 'Register as Seller',
    description: 'Create your seller account and complete your profile verification.'
  },
  {
    number: '02',
    title: 'Get Your Link',
    description: 'Receive your unique affiliate referral link from your seller dashboard.'
  },
  {
    number: '03',
    title: 'Earn 12%',
    description: 'Get paid 12% commission on every sale made through your referral link.'
  }
];

const faqs = [
  {
    question: 'Who can join the affiliate program?',
    answer: 'Anyone with an audience! Whether you are a blogger, YouTuber, Instagram influencer, or website owner, you can apply to join our program.'
  },
  {
    question: 'How much can I earn?',
    answer: 'There is no limit! Our top affiliates earn over ₹1,00,000 per month. Your earnings depend on your audience size and engagement.'
  },
  {
    question: 'When and how do I get paid?',
    answer: 'We pay weekly via PayPal, direct bank transfer, or UPI. Minimum payout is just ₹500.'
  },
  {
    question: 'What products can I promote?',
    answer: 'You can promote all products on HackKnow - templates, themes, Excel sheets, PowerPoint decks, and more!'
  }
];

const AffiliatePage = () => {
  return (
    <div className="min-h-screen bg-hack-white">
      {/* Hero */}
      <div className="bg-hack-black text-hack-white py-16 lg:py-24">
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto text-center">
            <Link 
              to="/" 
              className="inline-flex items-center gap-2 text-hack-yellow hover:text-hack-orange transition-colors mb-6"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Home
            </Link>
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-hack-yellow/20 rounded-full text-hack-yellow text-sm font-bold mb-6">
              <Zap className="w-4 h-4" />
              Earn Money Sharing What You Love
            </div>
            <h1 className="font-display font-bold text-4xl lg:text-6xl mb-6">
              Affiliate Program
            </h1>
            <p className="text-hack-white/60 text-lg max-w-2xl mx-auto mb-8">
              Register as a seller and earn passive income by promoting premium digital products. 
              Get 12% commission on every sale through your referral link.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/signup?next=/affiliate">
                <Button className="h-14 px-8 bg-gradient-to-r from-hack-yellow to-hack-orange text-hack-black font-bold rounded-full text-lg w-full sm:w-auto">
                  Apply Now - It is Free
                </Button>
              </Link>
              <Link to="/affiliate/learn-more">
                <Button 
                  variant="outline" 
                  className="h-14 px-8 border-white/20 text-white hover:bg-white/10 rounded-full w-full sm:w-auto"
                >
                  Learn More
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="bg-hack-yellow py-12">
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <div className="max-w-5xl mx-auto grid grid-cols-2 lg:grid-cols-4 gap-8 text-center">
            <div>
              <div className="font-display font-bold text-3xl lg:text-4xl text-hack-black">12%</div>
              <div className="text-hack-black/60 text-sm">Commission Rate</div>
            </div>
            <div>
              <div className="font-display font-bold text-3xl lg:text-4xl text-hack-black">₹10M+</div>
              <div className="text-hack-black/60 text-sm">Paid to Sellers</div>
            </div>
            <div>
              <div className="font-display font-bold text-3xl lg:text-4xl text-hack-black">5,000+</div>
              <div className="text-hack-black/60 text-sm">Active Sellers</div>
            </div>
            <div>
              <div className="font-display font-bold text-3xl lg:text-4xl text-hack-black">Weekly</div>
              <div className="text-hack-black/60 text-sm">Payout Schedule</div>
            </div>
          </div>
        </div>
      </div>

      {/* Benefits */}
      <div className="w-full px-4 sm:px-6 lg:px-8 py-16 lg:py-20">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="font-display font-bold text-3xl lg:text-4xl mb-4">
              Why Join Our Program?
            </h2>
            <p className="text-hack-black/60 max-w-2xl mx-auto">
              We provide everything you need to succeed as an affiliate marketer.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {benefits.map((benefit, index) => (
              <div 
                key={index}
                className="flex items-start gap-4 p-6 bg-white rounded-2xl border border-hack-black/5 card-hover"
              >
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-hack-yellow to-hack-orange flex items-center justify-center shrink-0">
                  <benefit.icon className="w-6 h-6 text-hack-black" />
                </div>
                <div>
                  <h3 className="font-display font-bold text-lg mb-2">{benefit.title}</h3>
                  <p className="text-hack-black/60 text-sm">{benefit.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* How It Works */}
      <div className="bg-hack-black text-white py-16 lg:py-20">
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="font-display font-bold text-3xl lg:text-4xl mb-4">
                How It Works
              </h2>
              <p className="text-white/60 max-w-2xl mx-auto">
                Start earning in three simple steps.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {steps.map((step, index) => (
                <div key={index} className="text-center">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-hack-yellow to-hack-orange flex items-center justify-center">
                    <span className="font-display font-bold text-2xl text-hack-black">
                      {step.number}
                    </span>
                  </div>
                  <h3 className="font-display font-bold text-xl mb-2">{step.title}</h3>
                  <p className="text-white/60 text-sm">{step.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* FAQ */}
      <div className="w-full px-4 sm:px-6 lg:px-8 py-16 lg:py-20">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="font-display font-bold text-3xl lg:text-4xl mb-4">
              Frequently Asked Questions
            </h2>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <div 
                key={index}
                className="bg-white rounded-2xl p-6 border border-hack-black/5"
              >
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-hack-yellow shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-display font-bold text-lg mb-2">{faq.question}</h3>
                    <p className="text-hack-black/60 text-sm">{faq.answer}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="w-full px-4 sm:px-6 lg:px-8 py-16">
        <div className="max-w-4xl mx-auto">
          <div className="bg-gradient-to-br from-hack-yellow to-hack-orange rounded-3xl p-8 lg:p-12 text-center">
            <h2 className="font-display font-bold text-3xl lg:text-4xl text-hack-black mb-4">
              Ready to Start Earning?
            </h2>
            <p className="text-hack-black/70 mb-8 max-w-lg mx-auto">
              Join our affiliate program today and start earning 30% commission on every sale you refer.
            </p>
            <Button className="h-14 px-8 bg-hack-black text-white font-bold rounded-full text-lg hover:bg-hack-black/80">
              Apply Now - It is Free
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AffiliatePage;
