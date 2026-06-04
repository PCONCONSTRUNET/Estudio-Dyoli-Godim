import React from 'react';

interface AnimatedSearchProps extends React.InputHTMLAttributes<HTMLInputElement> {
  // Pass any standard input props
}

export const AnimatedSearch: React.FC<AnimatedSearchProps> = ({ className = '', ...props }) => {
  return (
    <div className={`animated-search-wrapper ${className}`}>
      <form onSubmit={(e) => e.preventDefault()}>
        <label htmlFor="search" className="sr-only">Search</label>
        <input 
          required 
          pattern=".*\S.*" 
          type="search" 
          className="search-input" 
          id="search"
          {...props} 
        />
        <span className="search-caret" />
      </form>

      <style dangerouslySetInnerHTML={{__html: `
        .animated-search-wrapper {
          display: flex;
          width: 100%;
        }

        .animated-search-wrapper .search-input {
          color: hsl(var(--foreground));
          font: 1em/1.5 inherit;
        }

        .animated-search-wrapper form, 
        .animated-search-wrapper .search-input, 
        .animated-search-wrapper .search-caret {
          margin: auto;
        }

        .animated-search-wrapper form {
          position: relative;
          width: 100%;
          /* max-width: 17em; removed so it can fill the sidebar */
        }

        .animated-search-wrapper .search-input, 
        .animated-search-wrapper .search-caret {
          display: block;
          transition: all calc(1s * 0.5) linear;
        }

        .animated-search-wrapper .search-input {
          background: transparent;
          border-radius: 50%;
          box-shadow: 0 0 0 0.25em hsl(var(--gold)) inset;
          caret-color: #255ff4;
          width: 2em;
          height: 2em;
          -webkit-appearance: none;
          -moz-appearance: none;
          appearance: none;
          margin-left: 0; /* Align left */
        }

        .animated-search-wrapper .search-input::placeholder {
           color: transparent;
        }

        .animated-search-wrapper .search-input:focus, 
        .animated-search-wrapper .search-input:valid {
          background: rgba(255, 255, 255, 0.04);
          border-radius: 0.25em;
          box-shadow: none;
          padding: 0.75em 1em;
          transition-duration: calc(1s * 0.25);
          transition-delay: calc(1s * 0.25);
          width: 100%;
          height: 3em;
          margin-left: 0;
        }
        
        .animated-search-wrapper .search-input:focus::placeholder, 
        .animated-search-wrapper .search-input:valid::placeholder {
           color: rgba(255,255,255,0.3);
        }

        .animated-search-wrapper .search-input:focus {
          animation: showCaret 1s steps(1);
          outline: transparent;
        }

        .animated-search-wrapper .search-input:focus + .search-caret, 
        .animated-search-wrapper .search-input:valid + .search-caret {
          animation: handleToCaret 1s linear;
          background: transparent;
          width: 1px;
          height: 1.5em;
          transform: translate(0,-1em) rotate(-180deg) translate(7.5em,-0.25em);
          opacity: 0;
        }

        .animated-search-wrapper .search-input::-webkit-search-decoration {
          -webkit-appearance: none;
        }

        .animated-search-wrapper label.sr-only {
          color: #e3e4e8;
          overflow: hidden;
          position: absolute;
          width: 0;
          height: 0;
        }

        .animated-search-wrapper .search-caret {
          background: hsl(var(--gold));
          border-radius: 0 0 0.125em 0.125em;
          margin-bottom: -0.6em;
          width: 0.25em;
          height: 1em;
          /* Adjusted translate(1em, -1em) so it aligns perfectly with the left-aligned input */
          transform: translate(1em,-1em) rotate(-45deg) translate(0,0.875em);
          transform-origin: 50% 0;
          margin-left: 0; /* Align left */
        }

        /* Animations */
        @keyframes showCaret {
          from {
            caret-color: transparent;
          }

          to {
            caret-color: #255ff4;
          }
        }

        @keyframes handleToCaret {
          from {
            background: currentColor;
            width: 0.25em;
            height: 1em;
            transform: translate(1em,-1em) rotate(-45deg) translate(0,0.875em);
          }

          25% {
            background: currentColor;
            width: 0.25em;
            height: 1em;
            transform: translate(1em,-1em) rotate(-180deg) translate(0,0.875em);
          }

          50%, 62.5% {
            background: #255ff4;
            width: 1px;
            height: 1.5em;
            transform: translate(1em,-1em) rotate(-180deg) translate(7.5em,2.5em);
          }

          75%, 99% {
            background: #255ff4;
            width: 1px;
            height: 1.5em;
            transform: translate(1em,-1em) rotate(-180deg) translate(7.5em,-0.25em);
          }

          87.5% {
            background: #255ff4;
            width: 1px;
            height: 1.5em;
            transform: translate(1em,-1em) rotate(-180deg) translate(7.5em,0.125em);
          }

          to {
            background: transparent;
            width: 1px;
            height: 1.5em;
            transform: translate(1em,-1em) rotate(-180deg) translate(7.5em,-0.25em);
            opacity: 0;
          }
        }
      `}} />
    </div>
  );
};

export default AnimatedSearch;
