import React from 'react';
import { connect } from 'react-redux';
import { Link, Redirect } from 'react-router-dom';

import LanguageSelector from '../language-selector';
import ReviewForm from '../review-form';
import WebDB from '../../web-db';
import Modal from '../modal';
import reviewSentences from '../../../../doc/review-sentences.md'

const DEFAULT_STATE = {
  message: '',
  loading: false,
  sentences: [],
};

export const getReviewUrl = (language) => {
  return `/review/${language || ''}`;
};

export const getLanguageFromMatch = (match) => {
  // Always return an empty string if no lang specified.
  // This ensures we never have an undefined language.
  let lang = match.params.language;
  if (!lang) {
    lang = '';
  }
  return lang;
};

class Review extends React.Component {
  constructor(props) {
    super(props);
    this.state = DEFAULT_STATE;

    this.onReviewed = this.onReviewed.bind(this);
    this.onSelectLanguage = this.onSelectLanguage.bind(this);
  }

  resetState() {
    this.setState(DEFAULT_STATE);
  }

  componentDidMount() {
    this.fetchSentences();
  }

  componentDidUpdate(prevProps) {
    const oldLang = getLanguageFromMatch(prevProps.match);
    const newLang = this.getLanguageFromParams();
    if (oldLang !== newLang) {
      this.fetchSentences();
    }
  }

  getLanguageFromParams() {
    return getLanguageFromMatch(this.props.match);
  }

  // If user only has one language possible, redirect to it.
  needsRedirectToOnlyLang() {
    return (this.props.languages.length === 1 &&
            this.props.languages[0] !== this.getLanguageFromParams());
  }

  isInvalidLanguageRequest() {
    return this.props.languages && this.getLanguageFromParams() &&
           this.props.languages.indexOf(this.getLanguageFromParams()) === -1;
  }

  // Make sure the requests matches the user profile.
  isValidSentenceRequest() {
    if (!this.getLanguageFromParams()) {
      return false;
    }

    if (this.needsRedirectToOnlyLang()) {
      return false;
    }
    
    return true;
  }

  async fetchSentences() {
    if (!this.isValidSentenceRequest()) {
      return;
    }

    this.setState({
      loading: true,
    });

    const lang = this.getLanguageFromParams();
    const db = new WebDB(this.props.username, this.props.password);
    const sentences = await db.getSentencesNotVoted(lang);
    this.setState({
      loading: false,
      sentences,
    });
  }

  onSelectLanguage(language) {
    this.resetState();
    this.props.history.push(getReviewUrl(language));
  }

  async onReviewed(reviewedState) {
    const validated = reviewedState.validated;
    const invalidated = reviewedState.invalidated;
    const lang = this.getLanguageFromParams();

    const db = new WebDB(this.props.username, this.props.password);
    const { votes } = await db.vote(lang, validated, invalidated);
    this.setState({
      message: `${votes.length} sentences reviewed. Thank you!`,
      sentences: null,
    });

    this.fetchSentences();
  }

  renderContent() {
    if (this.state.loading) {
      return <p>Loading sentences...</p>;
    } else if (!this.state.sentences || this.state.sentences.length < 1) {
      console.log('rendercontent', this.state)
      return (
        <p>
          No sentences to review.&nbsp;
          <Link to={'/add'}>Add more sentences now!</Link>
        </p>
      );
    } else {
      return <ReviewForm message={this.state.message} onReviewed={this.onReviewed}
        sentences={this.state.sentences} useSwipeReview={this.props.useSwipeReview} />;
    }
  }

  render() {
    // If user only has one language possible, redirect to it.
    if (this.needsRedirectToOnlyLang()) {
      return (
        <Redirect to={getReviewUrl(this.props.languages[0])} />
      );
    }



    return (
      <div>
        <section>
          <h1>Review Sentences</h1>
          {/* review criteria modal */}
          <Modal text="ⓘ Review Criteria">
            <div dangerouslySetInnerHTML={{ __html: reviewSentences }} />
          </Modal>
          <LanguageSelector name="language-selector-review" only={this.props.languages}
            selected={this.getLanguageFromParams()} onChange={this.onSelectLanguage} />
        </section>
        { this.renderContent() }
      </div>
    );
  }
}

function mapStateToProps(state) {
  return {
    languages: state.app.languages,
    username: state.app.username,
    password: state.app.password,
    useSwipeReview: state.app.settings && state.app.settings.useSwipeReview,
  };
}

export default connect(mapStateToProps)(Review);
