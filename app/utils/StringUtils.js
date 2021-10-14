/**
 * Foo takes any argument.
 * The return value is 'baz' in all cases.
 * @param {template} bar - String that needs to be interpolated.
 * @param {map} [optionalArg] - requires a object with the properties that need to be replaced.
 */
 function templateString(template, map, fallback) {
  return template.replace(/\$\[[^\]]+\]/g, match => match
    .slice(2, -1)
    .trim()
    .split('.')
    .reduce(
      (searchObject, key) => searchObject[key] || fallback || match,
      map,
    ));
}


 function checkSpecialChars(text) {
  const regex = /^[a-zA-Z][a-zA-Z0-9_-]*$/gi;
  if (text && text.match(regex)) {
    return true;
  }
  return false;
}

 function checkNumberOnly(text) {
  const regex = /^[0-9]*$/gi;
  if (text && text.match(regex)) {
    return true;
  }
  return false;
}

 function checkAlphaNumeric(text) {
  const regex = /^[a-zA-Z0-9_-\s]*$/gi;
  if (text && text.match(regex)) {
    return true;
  }
  return false;
}


/**
 * Foo takes any argument.
 * The return value is 'baz' in all cases.
 * @param {str1} bar - character that needs to be search in a string.
 * @param {str2} - character that needs to be replaced in a string.
 * @param {ignore} [optionalArg] - set to true if you want to perform case insensitive search.
 * @param {text} bar - String that needs to be searched.
 */
 function replaceAll(str1, str2, ignore, text) {
  return text.replace(
    new RegExp(
      str1.replace(/([/,!\\^${}[\]().*+?|<>\-&])/g, '\\$&'),
      ignore ? 'gi' : 'g',
    ),
    typeof str2 === 'string' ? str2.replace(/\$/g, '$$$$') : str2,
  );
}

module.exports = {templateString,checkSpecialChars,checkNumberOnly,checkAlphaNumeric,replaceAll};
